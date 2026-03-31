import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type OutputValue = string | string[] | OutputObject;

export interface OutputObject {
  [key: string]: OutputValue;
}

export type OutputFormat = OutputObject;
type ParsedItem = Record<string, unknown>;

function buildFormatPrompt(outputFormat: OutputFormat, isListInput: boolean) {
  const serializedFormat = JSON.stringify(outputFormat);
  const hasDynamicElements = /<.*?>/.test(serializedFormat);
  const hasListOutput = /\[.*?\]/.test(serializedFormat);

  let prompt = `You must return valid JSON matching this format: ${serializedFormat}.`;
  prompt += " Do not include markdown fences. Return raw JSON only.";

  if (hasListOutput) {
    prompt += " If a field is a list of choices, choose the best matching value.";
  }

  if (hasDynamicElements) {
    prompt += " Any text inside < > means you must generate that content dynamically.";
  }

  if (isListInput) {
    prompt += " Return an array of JSON objects, one for each input item.";
  }

  return prompt;
}

export async function strict_output(
  systemPrompt: string,
  userPrompt: string | string[],
  outputFormat: OutputFormat,
  defaultCategory = "",
  outputValueOnly = false,
  model = "gpt-4.1-mini",
  temperature = 0.7,
  numTries = 3,
  verbose = false
) {
  const isListInput = Array.isArray(userPrompt);
  let lastError = "";

  for (let attempt = 0; attempt < numTries; attempt++) {
    try {
      const formatPrompt = buildFormatPrompt(outputFormat, isListInput);

      const response = await openai.chat.completions.create({
        model,
        temperature,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\n${formatPrompt}\n${lastError}`,
          },
          {
            role: "user",
            content: isListInput ? userPrompt.join("\n") : userPrompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No content returned by OpenAI.");
      }

      if (verbose) {
        console.log("OpenAI response:", content);
      }

      const rawParsed: unknown = JSON.parse(content);

      let parsed: ParsedItem[];
      if (isListInput) {
        if (Array.isArray(rawParsed)) {
          parsed = rawParsed as ParsedItem[];
        } else {
          throw new TypeError("Expected an array output.");
        }
      } else {
        parsed = [rawParsed as ParsedItem];
      }

      for (const item of parsed) {
        for (const key of Object.keys(outputFormat)) {
          if (/<.*?>/.test(key)) continue;

          if (!(key in item)) {
            throw new Error(`Missing key: ${key}`);
          }

          const formatValue = outputFormat[key];
          const itemValue = item[key];

          if (Array.isArray(formatValue)) {
            const choices = formatValue;

            let normalizedValue = itemValue;

            if (Array.isArray(normalizedValue)) {
              normalizedValue = normalizedValue[0];
            }

            if (
              typeof normalizedValue === "string" &&
              normalizedValue.includes(":")
            ) {
              normalizedValue = normalizedValue.split(":")[0];
            }

            if (
              typeof normalizedValue !== "string" ||
              (!choices.includes(normalizedValue) && defaultCategory)
            ) {
              normalizedValue = defaultCategory;
            }

            item[key] = normalizedValue;
          }
        }
      }

      if (outputValueOnly) {
        const simplified = parsed.map((item) => {
          const values = Object.values(item);
          return values.length === 1 ? values[0] : values;
        });

        return isListInput ? simplified : simplified[0];
      }

      return isListInput ? parsed : parsed[0];
    } catch (error) {
      lastError = `Previous error: ${
        error instanceof Error ? error.message : "Unknown error"
      }. Please correct the output format.`;

      if (attempt === numTries - 1) {
        console.error("strict_output failed:", error);
        return [];
      }
    }
  }

  return [];
}