import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupMissingLanguages() {
  console.log("🔍 Buscando topics con lenguaje incorrecto...\n");

  try {
    // Buscar todos los topics
    const { data: allRows, error } = await supabase
      .from("mcq_questions")
      .select("id, topic, language, question")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching data:", error);
      return;
    }

    // Agrupar por topic
    const topicMap = new Map();
    for (const row of allRows) {
      if (!topicMap.has(row.topic)) {
        topicMap.set(row.topic, []);
      }
      topicMap.get(row.topic).push(row);
    }

    let rowsToDelete = [];

    // Detectar topics que tienen múltiples idiomas
    for (const [topic, rows] of topicMap.entries()) {
      const languages = new Set(rows.map((r) => r.language));

      if (languages.size > 1) {
        console.log(`⚠️  Topic "${topic}" tiene múltiples idiomas:`, Array.from(languages));

        // Mantener solo el idioma más frecuente
        const langCount = {};
        for (const row of rows) {
          langCount[row.language] = (langCount[row.language] || 0) + 1;
        }

        const mainLanguage = Object.keys(langCount).reduce((a, b) =>
          langCount[a] > langCount[b] ? a : b
        );

        console.log(`   → Manteniendo: ${mainLanguage} (${langCount[mainLanguage]} rows)`);
        console.log(
          `   → Eliminando: ${Object.keys(langCount)
            .filter((l) => l !== mainLanguage)
            .map((l) => `${l} (${langCount[l]} rows)`)
            .join(", ")}`
        );

        // Marcar las filas del idioma minoritario para eliminar
        for (const row of rows) {
          if (row.language !== mainLanguage) {
            rowsToDelete.push(row.id);
          }
        }

        console.log();
      }
    }

    if (rowsToDelete.length === 0) {
      console.log("✅ No se encontraron topics con lenguajes mezclados.\n");
      return;
    }

    console.log(`\n🗑️  Total de filas a eliminar: ${rowsToDelete.length}\n`);

    // Eliminar filas en lotes de 100
    for (let i = 0; i < rowsToDelete.length; i += 100) {
      const batch = rowsToDelete.slice(i, i + 100);
      const { error: deleteError } = await supabase
        .from("mcq_questions")
        .delete()
        .in("id", batch);

      if (deleteError) {
        console.error(`Error eliminando batch ${i / 100 + 1}:`, deleteError);
        return;
      }

      console.log(`✅ Eliminadas filas ${i + 1}-${Math.min(i + 100, rowsToDelete.length)}`);
    }

    console.log(`\n✨ Limpieza completada! Se eliminaron ${rowsToDelete.length} filas.\n`);
  } catch (err) {
    console.error("Error:", err);
  }
}

cleanupMissingLanguages();
