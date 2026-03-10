import { useState, useRef } from "react";
import { FaUserPlus, FaFileImport, FaUpload, FaCheckCircle, FaTimesCircle, FaLayerGroup } from "react-icons/fa";
import * as XLSX from "xlsx";

function AddStudentPage({ addForm, setAddForm, addMsg, addLoading, handleAddStudent, handleBulkImport }) {
  const [tab, setTab] = useState("manual");
  const [importRows, setImportRows] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState({ text: "", type: "" });
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);

  const normalize = (key) => key.toLowerCase().replace(/[\s_-]+/g, "");

  const findCol = (keys, ...keywords) => {
    for (const kw of keywords) {
      const found = keys.find((k) => normalize(k).includes(kw));
      if (found) return found;
    }
    return null;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setImportMsg({ text: "", type: "" });
    setImportRows([]);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (rows.length === 0) {
        setImportMsg({ text: "File is empty or could not be read.", type: "error" });
        return;
      }
      const keys = Object.keys(rows[0]);
      const lrnCol = findCol(keys, "lrn", "learner");
      const nameCol = findCol(keys, "name", "fullname", "studentname", "pupil");
      const sectionCol = findCol(keys, "section", "class", "grade");
      if (!lrnCol || !nameCol) {
        setImportMsg({ text: `Could not find LRN or Name column. Columns in file: ${keys.join(", ")}`, type: "error" });
        return;
      }
      if (!sectionCol) {
        setImportMsg({ text: `Could not find a Section column. Add a "Section" column to your file. Columns found: ${keys.join(", ")}`, type: "error" });
        return;
      }
      const parsed = rows
        .map((r) => ({ lrn: String(r[lrnCol]).trim(), name: String(r[nameCol]).trim(), section: String(r[sectionCol]).trim() }))
        .filter((r) => r.lrn && r.name && r.section && r.lrn !== "0" && r.lrn !== "");
      if (parsed.length === 0) {
        setImportMsg({ text: "No valid rows found after parsing. Make sure LRN, Name, and Section columns are all filled.", type: "error" });
        return;
      }
      setImportRows(parsed);
    } catch {
      setImportMsg({ text: "Could not read the file. Please make sure it is a valid CSV or Excel file.", type: "error" });
    }
    e.target.value = "";
  };

  const doImport = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    setImportMsg({ text: "", type: "" });
    try {
      const result = await handleBulkImport(importRows);
      const inserted = result.inserted || 0;
      const skipped = result.skipped || 0;
      setImportMsg({
        text: `${inserted} student${inserted !== 1 ? "s" : ""} imported!${skipped > 0 ? ` ${skipped} skipped (LRN already exists).` : ""}`,
        type: "success",
      });
      setImportRows([]);
      setFileName("");
    } catch (err) {
      setImportMsg({ text: err.message || "Import failed.", type: "error" });
    }
    setImportLoading(false);
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-xs sm:max-w-xl bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-100 text-[#8B1A1A] p-3 rounded-xl">
            <FaUserPlus size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Add Student</h2>
            <p className="text-sm text-gray-400">Register manually or import from CSV / Excel</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab("manual")}
            className={"flex-1 py-2 rounded-lg text-sm font-semibold transition cursor-pointer " + (tab === "manual" ? "bg-white text-[#8B1A1A] shadow-sm" : "text-gray-500 hover:text-gray-700")}
          >
            Manual
          </button>
          <button
            onClick={() => setTab("import")}
            className={"flex-1 py-2 rounded-lg text-sm font-semibold transition cursor-pointer " + (tab === "import" ? "bg-white text-[#8B1A1A] shadow-sm" : "text-gray-500 hover:text-gray-700")}
          >
            Import CSV / Excel
          </button>
        </div>

        {/* Manual Tab */}
        {tab === "manual" && (
          <form onSubmit={handleAddStudent} className="space-y-5">
            {addMsg.text && (
              <div className={"px-4 py-3 rounded-xl text-sm font-medium " + (addMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200")}>
                {addMsg.text}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                LRN <span className="text-gray-400 font-normal">(12 digits)</span>
              </label>
              <input
                type="text"
                value={addForm.lrn}
                onChange={(e) => setAddForm((f) => ({ ...f, lrn: e.target.value }))}
                placeholder="e.g. 136456780009"
                maxLength={12}
                className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl focus:outline-none focus:border-[#8B1A1A] focus:bg-white transition text-sm font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Full Name</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Jose Rizal"
                className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl focus:outline-none focus:border-[#8B1A1A] focus:bg-white transition text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                <FaLayerGroup className="inline mr-1.5 text-[#8B1A1A]" size={12} />
                Section
              </label>
              <input
                type="text"
                value={addForm.section || ""}
                onChange={(e) => setAddForm((f) => ({ ...f, section: e.target.value }))}
                placeholder="e.g. Grade 10 - Rizal"
                className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl focus:outline-none focus:border-[#8B1A1A] focus:bg-white transition text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={addLoading}
              className="w-full bg-[#8B1A1A] hover:bg-[#6b1010] disabled:bg-red-300 text-white py-3.5 rounded-xl font-semibold transition cursor-pointer shadow-md shadow-red-100 mt-2"
            >
              {addLoading ? "Adding..." : "Add Student"}
            </button>
          </form>
        )}

        {/* Import Tab */}
        {tab === "import" && (
          <div className="space-y-5">
            {/* File drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 hover:border-[#8B1A1A] rounded-xl p-5 sm:p-8 flex flex-col items-center gap-3 cursor-pointer transition group"
            >
              <div className="bg-red-50 group-hover:bg-red-100 text-[#8B1A1A] p-4 rounded-full transition">
                <FaUpload size={22} />
              </div>
              <div className="text-center">
                <p className="text-gray-700 font-semibold text-sm">Click to upload file</p>
                <p className="text-gray-400 text-xs mt-1">Supports .csv, .xlsx, .xls</p>
              </div>
              {fileName && (
                <p className="text-[#8B1A1A] text-xs font-medium bg-red-50 px-3 py-1 rounded-full">{fileName}</p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />

            {/* Tip box */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-600">CSV / Excel Format:</p>
              <p>• Must have a <span className="font-mono bg-white px-1 rounded border border-gray-200">lrn</span> and <span className="font-mono bg-white px-1 rounded border border-gray-200">name</span> column</p>
              <p>• Other columns are ignored — only lrn and name will be used</p>
              <p>• Students with duplicate LRN will be skipped</p>
            </div>

            {/* Message */}
            {importMsg.text && (
              <div className={"px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 " + (importMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200")}>
                {importMsg.type === "success" ? <FaCheckCircle className="shrink-0" /> : <FaTimesCircle className="shrink-0" />}
                {importMsg.text}
              </div>
            )}

            {/* Preview table */}
            {importRows.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Preview — {importRows.length} student{importRows.length !== 1 ? "s" : ""} found
                </p>
                <div className="overflow-auto max-h-52 rounded-xl border border-gray-100">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 sticky top-0">
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">#</th>
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">LRN</th>
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((r, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-gray-700">{r.lrn}</td>
                          <td className="px-3 py-2 text-gray-800 font-medium">{r.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={doImport}
                  disabled={importLoading}
                  className="w-full mt-4 bg-[#8B1A1A] hover:bg-[#6b1010] disabled:bg-red-300 text-white py-3.5 rounded-xl font-semibold transition cursor-pointer shadow-md shadow-red-100 flex items-center justify-center gap-2"
                >
                  <FaFileImport />
                  {importLoading ? "Importing..." : `Import ${importRows.length} Student${importRows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AddStudentPage;
