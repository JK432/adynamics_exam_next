import React from "react";

const Loading = () => {
  return (
    <>
      <main className="w-full h-screen flex flex-col items-center justify-center">
        <div>
          <h4 className="text-center text-2xl font-bold text-slate-800">
            Sit Tight
          </h4>
          <p className="text-center text-xs text-gray-500">
            A better user experience is loading...
          </p>
        </div>
      </main>
    </>
  );
};

export default Loading;
