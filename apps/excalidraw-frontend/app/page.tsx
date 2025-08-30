import Link from "next/link";

export default function Home() {
  return (
    <div className="max-h-screen max-w-full overflow-hidden bg-radial-[at_30%_0%] to-[#000000] from-[#171717] flex justify-between">
      {/* <div className="absolute bottom-[16rem] z-[20] size-[24rem] overflow-hidden rounded-full bg-gradient-to-t from-blue-400 to-blue-700 blur-[16em]"></div> */}
      <div className="bg-[#1A1919] w-5/10 flex justify-between">
        <div className="h-screen w-32 bg-gradient-to-b from-[#000000] to-[#181818] opacity-50"></div>
        <div className="h-screen w-64 bg-gradient-to-b from-[#000000] to-[#181818] opacity-52"></div>
      </div>
      <div className="relative h-screen w-1/5 bg-gradient-to-b from-[#000000] to-[#505050] opacity-20">
        <p className="absolute top-[250px] -left-[85px] font-bold font-sans text-red-600 rotate-270 text-[165px] leading-[134%]text-stroke ">STEATH</p>
        <p className="absolute top-[16rem] -left-[5rem] font-bold font-sans text-black rotate-270 text-[163.26px] leading-[134%]text-stroke ">STEATH</p>
      </div>
      {/* <Link href={'/canvas/1'}>canvas</Link>     */}
    </div>
  );
}
