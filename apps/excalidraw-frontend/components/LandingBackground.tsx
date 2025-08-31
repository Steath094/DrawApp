export const LandingBackground = () => {
    return (
        <div className="fixed inset-0 -z-10 max-h-screen w-full overflow-hidden bg-radial-[at_30%_0%] from-[#171717] to-[#000000]">

      <div className="absolute inset-0 flex justify-between">
          <div className="relative flex w-1/2 justify-between overflow-hidden bg-[#1A1919]">
          <div className="h-screen w-32 bg-gradient-to-b from-[#000000] to-[#181818] opacity-50"></div>
          <div className="absolute top-0 left-[530px] opacity-50"><img  className="size-64" src="./pencil.svg" alt="pencil" /></div>
          <div className="absolute left-[2rem] -bottom-[19rem] rounded-full size-[32rem] overflow-hidden bg-gradient-to-t from-[#5A5A5A] to-white blur-[16em]  bg-[5A5A5A]"></div>
          
          <div className="h-screen w-64 bg-gradient-to-b from-[#000000] to-[#181818] opacity-52"></div>
        </div>
        <div className="relative h-screen w-1/5 bg-gradient-to-b from-[#000000] to-[#505050] opacity-20">
          {/* <p className="absolute top-[250px] -left-[85px] font-bold font-sans text-red-600 rotate-270 text-[165px] leading-[134%]text-stroke ">STEATH</p> */}
          <p className="absolute top-[16rem] -left-[5rem] font-bold font-sans text-black rotate-270 text-shadow-[0 0 3px #FF0000] [text-shadow:_0_0px_8px_#FF0000] text-[163.26px] leading-[134%]text-stroke ">STEATH</p>
        </div>
      </div>
    </div>
        
    );
};