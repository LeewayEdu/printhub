'use client'

// "Download PDF": opens the browser's print dialog, where "Save as PDF" is a choice. The print stylesheet makes it a clean A4 list.
export default function PrintButton() {
  return (
    <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
      Download PDF
    </button>
  )
}
