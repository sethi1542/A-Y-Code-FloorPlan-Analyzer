import React from "react";

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      <p className="mt-4 text-blue-400 font-medium text-sm">Analyzing… Don't worry if it looks stuck. File is being analyzed and will take some time</p>
    </div>
  );
}
