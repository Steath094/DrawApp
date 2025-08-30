import { LandingBackground } from "@/components/LandingBackground";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative font-sans text-white">
      <LandingBackground/>
      {/* <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
                    <div className="max-w-2xl text-center rounded-2xl bg-black/40 p-8 backdrop-blur-md border border-white/10">
                        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                            Build Your Frontend
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-gray-300">
                            This is your foreground content. You can build your entire application here, and the background will remain fixed behind it. The key is using CSS `position` and `z-index` properties correctly.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <a href="#" className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-gray-200 fs-visible:outlineocu focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400">
                                Get started
                            </a>
                            <a href="#" className="text-sm font-semibold leading-6 text-white">
                                Learn more <span aria-hidden="true">→</span>
                            </a>
                        </div>
                    </div>
      </div> */}
      <div className="relative top-4 left-8 text-3xl font-bold font-sans z-10 bg-gradient-to-b from-[#55535310] to-[#A0A0A010] w-fit p-4"><h1>COLLABCANVAS</h1></div>
      <div  className="absolute z-10 left-32 top-48 text-wrap w-3/9 flex flex-col gap-4 ">
        <h2 className="text-6xl font-bold leading-snug">VISUALIZE YOUR WORK</h2>
        <div>
          <h3 className="text-2xl font-semibold">Unify Your Team's Vision.</h3>
          <p className="text-[14px] text-[#DDDDDD]">Collab Canvasprovides a single,unified "canvas" where a team's Entire project lifecycle can unfold visually. Think of it as an infinite digital wall for real-time collaboration..</p>
        </div>
        <Link href={'/canvas/1'} className="bg-black text-xl font-bold px-6 py-3 rounded-full w-fit text-center ">START COLLABORATING</Link>
      </div>
    </main>
  );
}
