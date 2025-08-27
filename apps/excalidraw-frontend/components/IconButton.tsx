import { ReactNode } from "react";

export default function IconButton({
  icon,
  onClick,
  activated,
}: {
  icon: ReactNode;
  onClick: () => void;
  activated: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center
        rounded-full p-2
        shadow-sm
        ${activated 
          ? "bg-blue-600 text-white shadow-md" 
          : "bg-black/70 text-white hover:bg-gray-700"}
      `}
    >
      {icon}
    </button>
  );
}
