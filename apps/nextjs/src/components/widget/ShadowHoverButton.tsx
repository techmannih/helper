import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

export default function ShadowHoverButton({ isLoading }: { isLoading: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative">
      <button
        type="submit"
        aria-label="Send message"
        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-md bg-black text-2xl text-white transition-all duration-300 ease-in-out hover:border hover:border-black hover:bg-[#FF90E7] hover:text-black ${isHovered ? "-translate-x-0.5 -translate-y-0.5 transform" : ""} `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isLoading}
      >
        <PaperAirplaneIcon className="h-3.5 w-3.5 -rotate-90" />
      </button>
      <div className={`absolute left-0 top-0 h-8 w-8 rounded-md bg-black transition-all duration-300 ease-in-out`} />
    </div>
  );
}
