import { LandingBackground } from "@/components/LandingBackground";
import { Star } from "lucide-react";
import Link from "next/link";
export default function Home() {
  return (
    <main className="relative font-sans text-white min-h-screen overflow-hidden">
      <LandingBackground />
      
      <div className="relative top-4 left-8 text-3xl font-bold font-sans z-10 bg-gradient-to-b from-[#55535310] to-[#A0A0A010] w-fit p-4">
        <h1>COLLABCANVAS</h1>
      </div>
      <div className="absolute left-32 top-46 flex justify-between w-[62.5%]">
        <div className=" z-10 text-wrap w-1/2 flex flex-col gap-4 ">
          <h2 className="text-6xl font-bold leading-snug font-sans">
            VISUALIZE YOUR <span className="text-[#9f9f9f]">WORK</span>
          </h2>
          <div>
            <h3 className="text-2xl font-semibold">
              Unify Your Team's Vision.
            </h3>
            <p className="text-[14px] text-[#DDDDDD]">
              Collab Canvasprovides a single, unified "canvas" where a team's
              Entire project lifecycle can unfold visually. Think of it as an
              infinite digital wall for real-time collaboration..
            </p>
          </div>
          <Link
            href={"/canvas/1"}
            className="bg-black text-xl font-bold px-6 py-3 rounded-full w-fit text-center "
          >
            START COLLABORATING
          </Link>
        </div>
        <div className="">
          <img className="relative top-[-50px] -right-[120px] opacity-60 size-[446px]" src="/drawing.svg" alt="drawing" />
        </div>
      </div>
      <div className="absolute bottom-0 left-10"><img  className="size-64" src="./pencil.svg" alt="pencil" /></div>
      <div className="absolute top-28 right-32 w-fit py-4 px-8  bg-gradient-to-r from-[#55535310] to-[#A0A0A010] flex flex-col justify-center items-center">
        <div className="flex">
          <Star fill="#FFFFFF"/>
          <Star fill="#FFFFFF"/>
          <Star fill="#FFFFFF"/>
          <Star fill="#FFFFFF"/>
          <Star fill="#8D8D8D" stroke="#8D8D8D" />
        </div>
        <p>1000+ reviews</p>
      </div>
      <div className="display flex absolute bottom-12 right-[100px] w-3/5 gap-4">
        <div className="w-fit py-4 px-8  bg-gradient-to-r from-[#55535310] to-[#A0A0A010] flex flex-col justify-center items-center">
            <h5 className="text-2xl font-bold">Real-Time Sync</h5>
            <p className="text-[14px] text-center">Instantaneous, multi-user cursor tracking and updates</p>
        </div>
        <div className=" w-fit py-4 px-8  bg-gradient-to-r from-[#55535310] to-[#A0A0A010] flex flex-col justify-center items-center">
            <h5 className="text-2xl font-bold">Canvas Space</h5>
            <p className="text-[14px] text-center">Infinite, zoomable workspace for boundless ideation.</p>
        </div>
        <div className="w-fit py-4 px-8  bg-gradient-to-r from-[#55535310] to-[#A0A0A010] flex flex-col justify-center items-center">
            <h5 className="text-2xl font-bold">Ideal User</h5>
            <p className="text-[14px] text-center">Agile teams, product managers, and visual thinkers.</p>
        </div>
      </div>
    </main>
  );
}
