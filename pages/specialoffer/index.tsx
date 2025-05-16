import Link from 'next/link';
import Image from 'next/image';

// Main page component (Server Component)
export default function Home() {
    return (
        <div className="min-h-screen w-full bg-slate-900 text-white relative overflow-hidden">
            {/* Special Promotion Banner */}
            <div className="bg-orange-500 text-white text-center py-3 fixed bottom-0 md:top-0  w-full h-fit z-50">
                <div className="mx-auto px-4 max-w-[1280px] flex flex-col md:flex-row items-center justify-center gap-2">
                    {/*  <span className="font-bold text-xs md:text-lg">🔥 FACEBOOK SPECIAL: 69% OFF YOUR FIRST MONTH!</span>
                    <div className="hidden md:flex gap-2">
                        <PromoCodeButton />
                        <CountdownTimer />
                    </div> */}
                    <span className="font-bold text-xs md:text-lg">Import your first load with AI magic!</span>
                    <Link href="/auth/signin">
                        <button className="bg-white/90 hover:bg-orange-600 text-orange-600 text-xs px-3 py-1 md:py-2 mx-4 font-semibold rounded-xl shadow-lg shadow-orange-700/70 transform hover:scale-105 transition-all">
                            GET STARTED
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-6 h-6 ml-2 inline"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </Link>
                </div>
            </div>

            {/* Hero Section - Bolder and more impactful */}
            <section className="relative py-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-slate-900 z-0"></div>
                <div className="absolute inset-0 bg-[url('/placeholder.svg?height=800&width=1600')] opacity-10 z-0"></div>
                <div className="mx-auto px-4 relative z-10 max-w-[1280px]">
                    <div className="max-w-4xl mx-auto text-center mb-12">
                        <div className="inline-block bg-blue-800/60 text-white px-4 py-2 rounded-full mt-12 mb-6 font-bold">
                            TRANSPORTATION MANAGEMENT SYSTEM
                        </div>
                        <div className="flex items-center justify-center my-8 mb-2">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-12 h-12 mr-3"
                            >
                                <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 116 0h3a.75.75 0 00.75-.75V15z" />
                                <path d="M8.25 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0zM15.75 6.75a.75.75 0 00-.75.75v11.25c0 .087.015.17.042.248a3 3 0 015.958.464c.853-.175 1.522-.935 1.464-1.883a18.659 18.659 0 00-3.732-10.104 1.837 1.837 0 00-1.47-.725H15.75z" />
                                <path d="M19.5 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                            </svg>
                            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
                                Try The TMS That <span className="text-orange-500">Actually Works</span>
                            </h1>
                        </div>
                        <div className="flex items-center justify-center  mb-4">
                            <h1 className="whitespace-nowrap bg-white rounded-full w-fit text-center text-orange-500 px-4 py-1 font-extrabold  border-4 border-white/70 bg-gradient-to-r from-white/30 to-orange-600/60 bg-clip-text text-transparent mb-4">
                                {' '}
                                Powered by AI
                            </h1>
                        </div>

                        <div className="text-xl md:text-2xl mb-10 text-gray-200">
                            Get started for free. No credit card required. Import loads, assign drivers, track
                            deliveries, and send invoices—without touching a single spreadsheet.{' '}
                            <p className="text-orange-500 font-semibold my-0 ">
                                Simple. Smart. Designed for small fleets and solo operators. Finally, software that
                                speaks TRUCKING.
                            </p>
                        </div>

                        {/* <div className="bg-blue-900/50 p-4 rounded-xl mb-8 border border-blue-500/30">
                            <p className="text-xl font-bold mb-2">
                                <span className="text-orange-400">SPECIAL OFFER:</span> Use code{' '}
                                <span className="bg-orange-500 px-3 py-1 rounded-md">FB69</span> at signup
                            </p>
                            <div className="flex flex-col md:flex-row items-center justify-center gap-2">
                                <p>Get 69% OFF your first month! Limited time offer - expires in</p>
                                <CountdownTimer />
                            </div>
                            <div className="mt-3 flex flex-col items-end">
                                <PromoCodeButton />
                            </div>
                        </div> */}
                        <Link href="/auth/signin">
                            <button className="bg-orange-500 hover:bg-orange-600 text-white text-xl px-10 py-8 rounded-xl shadow-lg shadow-orange-500/30 transform hover:scale-105 transition-all">
                                Get Started for Free
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-6 h-6 ml-2 inline"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        </Link>
                    </div>
                    <div className="relative mt-16 space-y-4">
                        <Image
                            src="/dashboardmapview.png"
                            alt="App Dashboard Overview"
                            width={1600}
                            height={800}
                            loading="lazy"
                            className="rounded-xl shadow-none hidden sm:block"
                        />
                        <Image
                            src="/driverassignment.png"
                            alt="App Dashboard Overview"
                            width={1600}
                            height={800}
                            loading="lazy"
                            className="rounded-xl shadow-none sm:hidden"
                        />
                        <Image
                            src="/driverinvoice.png"
                            alt="App Dashboard Overview"
                            width={1600}
                            height={800}
                            loading="lazy"
                            className="rounded-xl shadow-none sm:hidden"
                        />
                    </div>
                </div>
            </section>

            <section className="py-8 bg-gradient-to-r from-blue-900 to-slate-800">
                <div className="mx-auto px-4 max-w-[1280px]">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
                        {/* <div className="text-xl font-bold">
                            <span className="text-orange-500">FB69 PROMO:</span> Expires in
                        </div> */}
                        <CountdownTimer showLabels={true} />
                        <Link href="/auth/signin">
                            {/* <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg">
                                Claim 69% Off Now
                            </button> */}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Feature Highlights - Bold cards with icons */}
            <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-800">
                <div className="mx-auto px-4 max-w-[1280px]">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
                                One System. Complete Control.
                            </span>
                        </h2>
                        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                            Stop juggling multiple tools. CarrierNest handles everything your trucking operation needs.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Feature Card 1 */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-blue-500/20 shadow-xl transform hover:scale-105 transition-all">
                            <div className="bg-blue-600 p-3 rounded-xl inline-block mb-6">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-8 h-8"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM9.75 14.25a.75.75 0 000 1.5H15a.75.75 0 000-1.5H9.75z"
                                        clipRule="evenodd"
                                    />
                                    <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Drop the Manual Work</h3>
                            <ul className="space-y-3">
                                <li className="flex items-start">
                                    <div className="bg-green-500 p-1 rounded-full mr-3 mt-1.5">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-3 h-3 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <span>Just drag and drop your rate con</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-green-500 p-1 rounded-full mr-3 mt-1.5">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-3 h-3 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <span>AI pulls out everything you need</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-green-500 p-1 rounded-full mr-3 mt-1.5">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-3 h-3 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <span>No typing, no guesswork</span>
                                </li>
                            </ul>
                        </div>

                        {/* Feature Card 2 */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-blue-500/20 shadow-xl transform hover:scale-105 transition-all">
                            <div className="bg-orange-500 p-3 rounded-xl inline-block mb-6">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-8 h-8"
                                >
                                    <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 116 0h3a.75.75 0 00.75-.75V15z" />
                                    <path d="M8.25 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0zM15.75 6.75a.75.75 0 00-.75.75v11.25c0 .087.015.17.042.248a3 3 0 015.958.464c.853-.175 1.522-.935 1.464-1.883a18.659 18.659 0 00-3.732-10.104 1.837 1.837 0 00-1.47-.725H15.75z" />
                                    <path d="M19.5 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Assign & Track Loads</h3>
                            <ul className="space-y-3">
                                <li className="flex items-start">
                                    <div className="bg-green-500 p-1 rounded-full mr-3 mt-1.5">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-3 h-3 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <span>Assign loads in seconds</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-green-500 p-1 rounded-full mr-3 mt-1.5">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-3 h-3 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <span>Pay drivers by mile, load, or hour</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-green-500 p-1 rounded-full mr-3 mt-1.5">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-3 h-3 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <span>See where everyone is at any time</span>
                                </li>
                            </ul>
                        </div>

                        {/* Feature Card 3 */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-blue-500/20 shadow-xl transform hover:scale-105 transition-all">
                            <div className="bg-purple-600 p-3 rounded-xl inline-block mb-6">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-8 h-8"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z"
                                        clipRule="evenodd"
                                    />
                                    <path
                                        fillRule="evenodd"
                                        d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zM6 12a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V12zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM6 15a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V15zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM6 18a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V18zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold mb-4">One-Click Invoicing</h3>
                            <ul className="space-y-3">
                                <li className="flex items-start">
                                    <div className="bg-green-500 p-1 rounded-full mr-3 mt-1.5">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-3 h-3 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <span>Delivery done? POD uploaded?</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-green-500 p-1 rounded-full mr-3 mt-1.5">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-3 h-3 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <span>Click once—invoice sent</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="bg-green-500 p-1 rounded-full mr-3 mt-1.5">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-3 h-3 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <span>Fast and Simple</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mobile App Section - Visual and bold */}
            <section className="py-20 bg-gradient-to-b from-slate-800 to-slate-900">
                <div className="mx-auto px-4 max-w-[1280px]">
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-16">
                        <div className=" ">
                            <div className="relative ">
                                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-600/50 rounded-3xl blur-2xl opacity-30"></div>
                                <Image
                                    src="/carriernestiphoneapp.png"
                                    alt="App Dashboard Overview"
                                    width={350}
                                    height={500}
                                    loading="lazy"
                                    className="  rounded-xl shadow-none "
                                />
                            </div>
                        </div>
                        <div className="lg:w-1/2">
                            <div className="inline-block bg-blue-600 text-white px-4 py-2 rounded-full mb-6 font-bold">
                                DRIVER-FRIENDLY
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-8">
                                Mobile App That <span className="text-orange-500">Actually Makes Sense</span>
                            </h2>
                            <div className="space-y-6">
                                <div className="flex items-start">
                                    <div className="bg-green-500 p-3 rounded-full mr-4 mt-1">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-4 h-4 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">See where they&apos;re going</h3>
                                        <p className="text-gray-300">
                                            Clear directions and load details at their fingertips
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="bg-green-500 p-3 rounded-full mr-4 mt-1">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-4 h-4 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Start and finish trips</h3>
                                        <p className="text-gray-300">Simple one-tap controls for trip management</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="bg-green-500 p-3 rounded-full mr-4 mt-1">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-4 h-4 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Upload delivery docs</h3>
                                        <p className="text-gray-300">
                                            Snap a photo and you&apos;re done - no paperwork
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="bg-green-500 p-3 rounded-full mr-4 mt-1">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-4 h-4 text-slate-900"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Get tracked without the drama</h3>
                                        <p className="text-gray-300">
                                            Privacy-focused location tracking that just works
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-10 bg-slate-800 p-6 rounded-xl border border-blue-500/20">
                                <p className="text-xl font-bold">
                                    No training videos. No complaints. Just a solid tool that works.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Analytics Section - Bold and visual */}
            <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-800">
                <div className="mx-auto px-4 max-w-[1280px]">
                    <div className="text-center mb-16">
                        <div className="inline-block bg-purple-600 text-white px-4 py-2 rounded-full mb-6 font-bold">
                            REAL-TIME INSIGHTS
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            See What&apos;s Working. <span className="text-orange-500">Fix What&apos;s Not.</span>
                        </h2>
                        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                            Live reports show you exactly where your business stands, without the spreadsheet headaches.
                        </p>
                    </div>

                    <div className="relative mb-16 text-center ">
                        <div className="absolute -inset-12 bg-gradient-to-bl from-blue-500/50 to-purple-400/60 rounded-xl blur-3xl opacity-30"></div>
                        <Image
                            src="/dashboarddailyanalytics.png"
                            alt="App Dashboard Overview"
                            width={800}
                            height={200}
                            loading="lazy"
                            className="  rounded-xl shadow-none text-center mx-auto"
                        />
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-slate-800 p-8 rounded-xl border border-blue-500/20 shadow-lg">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-10 h-10 text-green-500 mb-4"
                            >
                                <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
                            </svg>
                            <h3 className="text-2xl font-bold mb-2">Who&apos;s pulling weight</h3>
                            <p className="text-gray-300">See your top performers and optimize your fleet accordingly</p>
                        </div>
                        <div className="bg-slate-800 p-8 rounded-xl border border-blue-500/20 shadow-lg">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-10 h-10 text-blue-500 mb-4"
                            >
                                <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
                            </svg>
                            <h3 className="text-2xl font-bold mb-2">What&apos;s making money</h3>
                            <p className="text-gray-300">Track your most profitable routes and customers</p>
                        </div>
                        <div className="bg-slate-800 p-8 rounded-xl border border-blue-500/20 shadow-lg">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-10 h-10 text-orange-500 mb-4"
                            >
                                <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
                            </svg>
                            <h3 className="text-2xl font-bold mb-2">What&apos;s falling behind</h3>
                            <p className="text-gray-300">Identify problems before they cost you money</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonial Section - Bold and trustworthy */}
            <section className="py-20 bg-gradient-to-b from-slate-800 to-slate-900">
                <div className="mx-auto px-4 max-w-[1280px]">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-bold mb-4">Don&apos;t take our word for it</h2>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-10 rounded-2xl border border-blue-500/20 shadow-2xl relative">
                            <div className="absolute -top-6 -left-6">
                                <div className="bg-orange-500 p-4 rounded-full">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="w-8 h-8 text-white"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex mb-6">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <svg
                                        key={i}
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="w-6 h-6 text-yellow-500"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                ))}
                            </div>

                            <div className="text-xl italic mb-8">
                                <blockquote className="leading-relaxed mb-4">
                                    <p>
                                        &#8220;Before CarrierNest, our whole operation was running on paper, texts, and
                                        prayers. Loads were everywhere, driver pay was a guessing game, and we had no
                                        real way to track how the business was doing. Invoicing alone took hours and was
                                        still full of mistakes.&#8221;
                                    </p>
                                    <p className="mt-4">
                                        &#8220;Switching to CarrierNest was like flipping a switch. We drag and drop
                                        rate cons, the AI pulls all the info, and everything else just flows&mdash;from
                                        dispatch to payment to invoicing. I actually know where my money&rsquo;s going
                                        now.&#8221;
                                    </p>
                                    <p className="mt-4 font-semibold">
                                        It&rsquo;s simple, it&rsquo;s fast, and best of all&mdash;it just works.
                                        CarrierNest easily saves us several hours a day. No BS.&#8221;
                                    </p>
                                </blockquote>

                                <div>
                                    <p className="font-bold text-xl">Manny B.</p>
                                    <p className="text-gray-300">Dispatcher, Indianapolis, IN</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Promotion Highlight */}
            {/* <section className="py-12 bg-gradient-to-r from-orange-600 to-orange-800">
                <div className="mx-auto px-4 max-w-[1280px]">
                    <div className="text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            FACEBOOK EXCLUSIVE: 69% OFF YOUR FIRST MONTH.
                        </h2>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-6">
                            <div className="bg-white text-orange-600 px-6 py-3 rounded-lg text-2xl font-bold">
                                Use Code: FB69
                            </div>
                            <PromoCodeButton large={true} />
                        </div>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-2 mb-6">
                            <p className="text-xl font-bold">This special offer expires in:</p>
                            <CountdownTimer showLabels={true} large={true} />
                        </div>
                        <Link href="/auth/signin">
                            <button className="bg-white hover:bg-gray-100 text-orange-600 text-xl px-8 py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all">
                                Claim Your 69% Discount Now
                            </button>
                        </Link>
                    </div>
                </div>
            </section> */}

            {/* Final CTA - Bold and unmissable */}
            <section className="py-20 bg-gradient-to-r from-blue-900 to-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/placeholder.svg?height=800&width=1600')] opacity-10 z-0"></div>
                <div className="mx-auto px-4 relative z-10 max-w-[1280px]">
                    {/* Clean Pricing Comparison Table */}
                    <div className="container mx-auto my-8 mb-24">
                        <h1 className="text-3xl font-semibold text-center mb-4">Pricing Plans</h1>
                        <PricingTable />
                    </div>

                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-block bg-blue-800/60 text-white px-6 py-3 rounded-full mb-8 font-bold text-xl">
                            🔥 READY TO SEE IT WORK?
                        </div>
                        <h2 className="text-5xl md:text-6xl font-extrabold mb-8">
                            Try It For Free.
                            <br />
                            <span className="text-orange-500">No Credit Card Required.</span>
                        </h2>
                        {/* <div className="bg-blue-900/50 p-6 rounded-xl mb-8 border border-blue-500/30">
                            <p className="text-slate-400 text-sm p-4">
                                Like what you see? Use promo code below to get start fo $8.99 only per driver.
                            </p>
                            <p className="text-2xl font-bold mb-2">
                                Remember to use code <span className="bg-orange-500 px-4 py-1 rounded-md">FB69</span>{' '}
                                for 69% OFF
                            </p>
                            <div className="flex flex-col md:flex-row items-center justify-center gap-2">
                                <p className="text-lg">Limited time offer - expires in:</p>
                                <CountdownTimer />
                            </div>
                            <div className="mt-3 flex flex-col items-end">
                                <PromoCodeButton />
                            </div>
                        </div> */}
                        <p className="text-xl md:text-2xl mb-12 text-gray-200">
                            Join other trucking companies who&apos;ve simplified their operations with CarrierNest.
                        </p>
                        <Link href="/auth/signin">
                            <button className="bg-orange-500 hover:bg-orange-600 text-white text-2xl py-2 px-4 sm:px-12 sm:py-8 rounded-xl shadow-lg shadow-orange-500/30 transform hover:scale-105 transition-all">
                                👉 I AM READY TO HELP MY TRUCKING!
                            </button>
                        </Link>
                        <div className="mt-8 flex flex-col items-center">
                            <p className="text-gray-300 mb-4">Trusted by trucking companies across the country</p>
                            <div className="flex items-center space-x-2 text-yellow-500">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <svg
                                        key={i}
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="w-5 h-5"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                ))}
                                <span className="text-white ml-2">4.8/5 reviews</span>
                            </div>
                        </div>
                        <p className="mt-6 text-gray-300">The TMS for the 99% of fleets that actually do the work.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { Span } from 'next/dist/trace';
import PricingTable from 'components/PricingTable';

// Countdown Timer Component
interface CountDownProps {
    showLabels?: boolean;
    large?: boolean;
}

const CountdownTimer: React.FC<CountDownProps> = ({ showLabels = false, large = false }) => {
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        // May 13, 2025 at 10 PM
        const startDate = new Date(2025, 4, 13, 22, 0, 0);

        const calculateTimeLeft = () => {
            const now = new Date();
            const timeDiff = now.getTime() - startDate.getTime();

            // Calculate how many complete 48-hour cycles have passed
            const cycleMs = 48 * 60 * 60 * 1000;
            const cycles = Math.floor(timeDiff / cycleMs);

            // Calculate the end time of the current cycle
            const currentCycleEndTime = new Date(startDate.getTime() + (cycles + 1) * cycleMs);

            // Calculate time remaining in current cycle
            const timeRemaining = currentCycleEndTime.getTime() - now.getTime();

            // Convert to hours, minutes, seconds
            const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

            return { hours, minutes, seconds };
        };

        // Initial calculation
        setTimeLeft(calculateTimeLeft());

        // Update every second
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        // Cleanup
        return () => clearInterval(timer);
    }, []);

    const { hours, minutes, seconds } = timeLeft;

    if (showLabels) {
        return (
            <div className="flex items-center gap-2">
                <div className={`bg-slate-700 px-3 py-2 rounded-lg ${large ? 'px-4 py-3' : ''}`}>
                    <span className={`font-mono font-bold ${large ? 'text-3xl' : 'text-2xl'}`}>
                        {hours.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs block">HRS</span>
                </div>
                <div className="text-xl">:</div>
                <div className={`bg-slate-700 px-3 py-2 rounded-lg ${large ? 'px-4 py-3' : ''}`}>
                    <span className={`font-mono font-bold ${large ? 'text-3xl' : 'text-2xl'}`}>
                        {minutes.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs block">MIN</span>
                </div>
                <div className="text-xl">:</div>
                <div className={`bg-slate-700 px-3 py-2 rounded-lg ${large ? 'px-4 py-3' : ''}`}>
                    <span className={`font-mono font-bold ${large ? 'text-3xl' : 'text-2xl'}`}>
                        {seconds.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs block">SEC</span>
                </div>
            </div>
        );
    }

    return (
        <span className="font-mono font-bold">
            {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:
            {seconds.toString().padStart(2, '0')}
        </span>
    );
};

// Promo Code Button Component
interface PromoCodeButtonProps {
    large?: boolean;
}

const PromoCodeButton: React.FC<PromoCodeButtonProps> = ({ large = false }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText('FB69').then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <button
            onClick={copyToClipboard}
            className={`
        ${copied ? 'bg-green-500 text-white' : 'bg-white text-blue-600'}
        ${large ? 'px-4 py-3 text-lg' : 'px-3 py-1 text-sm'}
        rounded-md font-bold transition-colors flex items-center gap-1
      `}
            aria-label="Copy promo code FB69 to clipboard"
        >
            {copied ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path
                            fillRule="evenodd"
                            d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                            clipRule="evenodd"
                        />
                    </svg>
                    Copied!
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path
                            fillRule="evenodd"
                            d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                            clipRule="evenodd"
                        />
                        <path d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                    </svg>
                    Copy Code
                </>
            )}
        </button>
    );
};
