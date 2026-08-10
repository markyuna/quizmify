import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Destructive maintenance endpoint (bulk-deletes mcq_questions rows), so it
// fails closed: requires ADMIN_SECRET to be configured and matched via
// `Authorization: Bearer <ADMIN_SECRET>`, unlike the optional CRON_SECRET
// check on the cron routes.
export async function POST(req: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("🔍 Iniciando limpieza de topics con lenguajes incorrectos...\n");

    const supabase = getSupabaseAdmin();

    // Obtener todas las preguntas activas
    const { data: allRows, error } = await supabase
      .from("mcq_questions")
      .select("id, topic, language, created_at")
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Agrupar por topic
    const topicMap = new Map<
      string,
      Array<{ id: string; language: string; created_at: string }>
    >();

    for (const row of allRows || []) {
      if (!topicMap.has(row.topic)) {
        topicMap.set(row.topic, []);
      }
      topicMap.get(row.topic)!.push(row);
    }

    const rowsToDelete: string[] = [];
    const report: Array<{ topic: string; action: string }> = [];

    // Detectar topics con múltiples idiomas
    for (const [topic, rows] of topicMap.entries()) {
      const languages = new Set(rows.map((r) => r.language));

      if (languages.size > 1) {
        // Contar por idioma
        const langCount: Record<string, number> = {};
        for (const row of rows) {
          langCount[row.language] = (langCount[row.language] || 0) + 1;
        }

        // Mantener el idioma más frecuente
        const mainLanguage = Object.keys(langCount).reduce((a, b) =>
          langCount[a] > langCount[b] ? a : b
        );

        console.log(`⚠️  Topic: "${topic}"`);
        console.log(`   Idiomas encontrados: ${Array.from(languages).join(", ")}`);
        console.log(`   Manteniendo: ${mainLanguage} (${langCount[mainLanguage]} rows)`);

        // Marcar para eliminar
        for (const row of rows) {
          if (row.language !== mainLanguage) {
            rowsToDelete.push(row.id);
            console.log(`   ❌ Eliminando: ${row.language} (${row.id})`);
          }
        }

        report.push({
          topic,
          action: `Kept ${mainLanguage}, deleted ${Object.keys(langCount)
            .filter((l) => l !== mainLanguage)
            .join(", ")}`,
        });

        console.log();
      }
    }

    if (rowsToDelete.length === 0) {
      console.log("✅ No se encontraron topics con lenguajes mezclados.\n");
      return NextResponse.json({
        success: true,
        message: "No cleanup needed",
        deletedCount: 0,
        report,
      });
    }

    console.log(`🗑️  Eliminando ${rowsToDelete.length} filas...\n`);

    // Eliminar en lotes
    for (let i = 0; i < rowsToDelete.length; i += 100) {
      const batch = rowsToDelete.slice(i, i + 100);
      const { error: deleteError } = await supabase
        .from("mcq_questions")
        .delete()
        .in("id", batch);

      if (deleteError) {
        console.error(`Error eliminando batch:`, deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      console.log(
        `✅ Eliminadas filas ${i + 1}-${Math.min(i + 100, rowsToDelete.length)}`
      );
    }

    console.log(`\n✨ Limpieza completada! Se eliminaron ${rowsToDelete.length} filas.\n`);

    return NextResponse.json({
      success: true,
      message: `Cleanup completed - deleted ${rowsToDelete.length} rows`,
      deletedCount: rowsToDelete.length,
      report,
    });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
