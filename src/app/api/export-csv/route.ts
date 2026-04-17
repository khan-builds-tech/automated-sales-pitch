import { NextRequest } from "next/server";
import { SpreadsheetRow } from "@/lib/types";
import fs from "fs";
import path from "path";

const CSV_PATH = path.join(process.cwd(), "sales_pitches.csv");
const HEADERS = ["Business Name", "Location", "Website", "Phone Number", "Call Script", "Email"];

function escapeCSV(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function POST(request: NextRequest) {
  const row = (await request.json()) as SpreadsheetRow;

  if (!row.name) {
    return Response.json({ error: "Business name is required" }, { status: 400 });
  }

  try {
    const fileExists = fs.existsSync(CSV_PATH);

    const csvRow = [
      row.name,
      row.location,
      row.website,
      row.phone,
      row.callScript,
      row.email,
    ].map(escapeCSV).join(",");

    if (!fileExists) {
      const header = HEADERS.map(escapeCSV).join(",");
      fs.writeFileSync(CSV_PATH, header + "\n" + csvRow + "\n", "utf-8");
    } else {
      fs.appendFileSync(CSV_PATH, csvRow + "\n", "utf-8");
    }

    // Count total rows (excluding header)
    const content = fs.readFileSync(CSV_PATH, "utf-8");
    const totalRows = content.trim().split("\n").length - 1;

    return Response.json({ success: true, totalRows, path: CSV_PATH });
  } catch (err) {
    console.error("CSV export error:", err);
    return Response.json({ error: "Failed to export to CSV" }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(CSV_PATH)) {
      return Response.json({ error: "No data exported yet" }, { status: 404 });
    }

    const content = fs.readFileSync(CSV_PATH, "utf-8");
    return new Response(content, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="sales_pitches.csv"',
      },
    });
  } catch (err) {
    console.error("CSV download error:", err);
    return Response.json({ error: "Failed to download CSV" }, { status: 500 });
  }
}
