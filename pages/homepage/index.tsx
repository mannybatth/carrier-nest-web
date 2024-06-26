import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';

type loadFeatureProps = {
    name: string;
    desc: string;
};

const Homepage = () => {
    const { status, data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    React.useEffect(() => {
        if (status === 'loading') return; // Do nothing while loading
        //if (status === 'unauthenticated') signIn(); // If not authenticated, force log in
        if (status === 'unauthenticated') router.replace('/homepage');
        // If authenticated, but no default carrier, redirect to carrier setup
        if (status === 'authenticated' && !session?.user?.defaultCarrierId) {
            router.replace('/setup/carrier');
        } else if (status === 'authenticated' && pathname === '/setup/carrier') {
            router.replace('/');
        }
    }, [status, session]);

    const appFeatures: loadFeatureProps[] = [
        { name: 'AI Load Import', desc: 'Import load with drag-drop rate con feature, no data entry needed.' },
        {
            name: 'Full Load Lifecycle',
            desc: 'Manage your load from booked, driver assignment, loaded, unloaded, pod ready, and invoiced.',
        },
        { name: 'Broker Management', desc: 'Manage all broker loads under one page.' },
        { name: 'Driver Management', desc: 'Add/remove drivers to loads, track driver location on assigned load.' },
        { name: 'Invoice Genration', desc: 'See pod ready loads and generate invoices with one click.' },
        {
            name: 'Document Management',
            desc: 'All load documents are connected to each load so you can easily see/download them.',
        },
        { name: 'Track Payments', desc: 'Mark loads paid (partial or full.)' },
        { name: 'Company Reports', desc: 'Track different metrix to stay informed about company activity.' },
    ];
    return (
        <section className="relative min-h-screen min-w-screen bg-slate-100 px-6 sm:px-14 m-0">
            <div className="max-w-7xl mx-auto">
                <div className="py-10 px-4 shadow-2xl shadow-slate-50 rounded-b-2xl pb-6 sticky top-0 h-[50px] z-50 bg-slate-100 mb-4   flex flex-row justify-between items-center">
                    <div className="font-extrabold text-lg md:text-3xl text-gray-800 flex flex-row justify-between items-center gap-2 underline underline-offset-2">
                        <Image src={'/logo_truck_100.png'} alt="logo" width={46} height={46} />
                        <p>Carrier Nest</p>
                    </div>
                    <div className="">
                        <button
                            className=" p-1 rounded-xl from-rose-200 shadow-2xl via-cyan-400 to-indigo-600 bg-gradient-to-bl"
                            onClick={() => (status === 'authenticated' ? router.push('/') : signIn())}
                        >
                            <span className="block bg-cyan-900 px-4 py-2 font-black text-sm rounded-lg text-white hover:bg-transparent hover:text-white transition">
                                {status === 'authenticated' ? 'Dashboard' : 'Sign In'}
                            </span>
                        </button>
                    </div>
                </div>
                <div className="h-[600px] relative mt-10 flex flex-col flex-1 py-auto justify-around bg-gradient-to-r from-gray-200 to-purple-100 rounded-3xl p-4 mb-5">
                    <div className=" flex flex-col flex-1 justify-evenly">
                        <h1 className=" font-bold text-3xl leading-snug flex flex-col">
                            <span className="text-5xl font-extrabold mb-1 text-cyan-700">Trucking Simplified.</span>
                            <span className="text-xl font-light pl-2 text-slate-600">
                                Carrier Nest lets you focus on growing your business. <br></br>We aim to simplify
                                logistics for owner operators/medium sized trucking companies.
                            </span>
                        </h1>
                    </div>
                    <div className="absolute top-0 m-4 right-0 sm:top-0  lg:top-auto sm:m-4 md:flex">
                        <Image src={'/truckbg.png'} alt="logo" width={300} height={75} className="rounded-xl" />
                    </div>
                </div>
                <div className="py-16 flex flex-col w-full">
                    <h1 className="mb-10 w-full text-center font-black text-3xl text-orange-700">App Features</h1>
                    <div
                        className="grid grid-col-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3  gap-16"
                        key={'featurecontainer'}
                    >
                        {appFeatures.map((feature, index) => (
                            <div
                                key={index}
                                className="px-8 py-10 border shadow-md text-center bg-slate-200 text-slate-500 border-slate-100 rounded-3xl font-bold text-sm justify-around items-center"
                            >
                                <div>
                                    <p className="font-base  text-lg text-cyan-900 mb-2">{feature.name}</p>
                                    <p className="font-light text-sm text-slate-500">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="relative h-full w-full rounded-3xl text-center flex flex-row justify-between my-12">
                    <h1 className="   w-fit mr-10 p-4 my-auto flex-1 text-center font-black text-3xl text-cyan-800 bg-slate-100 border-slate-400 border-0 rounded-2xl">
                        App Dashboard Overview
                    </h1>
                    <Image
                        src={'/dashboard.png'}
                        alt="logo"
                        height={0}
                        width={0}
                        sizes="100vw"
                        className="rounded-3xl border-4 border-slate-300 "
                        style={{ width: '65%', height: 'auto', margin: 'auto' }}
                    />
                </div>
                <article className="p-1.5 mx-auto my-24 w-full rounded-3xl bg-gradient-to-r from-rose-400 via-cyan-600 to-purple-400">
                    <div className="py-40 bg-slate-100 rounded-2xl p-4 text-center flex flex-col justify-center items-center">
                        <h4 className="text-5xl font-bold">Get Started with Carrier Nest Today!</h4>

                        <p className="font-light text-lg text-center text-slate-400 max-w-lg w text-cener mt-4">
                            Carrier Nest isn&#39;t just a management system; it&#39;s a partner in your success. Our
                            dedicated support team is here to assist you every step of the way, ensuring you get the
                            most out of our system. Join the growing number of trucking companies that trust Carrier
                            Nest to keep their operations running smoothly. Experience the future of trucking management
                            today.
                        </p>
                        <button
                            className="mt-14 p-1 rounded-xl from-rose-200 shadow-2xl via-cyan-400 to-indigo-600 bg-gradient-to-bl"
                            onClick={() => (status === 'authenticated' ? router.push('/') : signIn())}
                        >
                            <span className="block bg-cyan-900 px-4 py-2 font-black text-xl rounded-lg text-white hover:bg-transparent hover:text-white transition">
                                Start free trial
                            </span>
                        </button>
                    </div>
                </article>
                <div className="h-fit flex flex-row justify-between bg-slate-200 p-4 rounded-t-2xl">
                    <p className="font-light text-lg text-center text-slate-400  text-cener py-4">
                        All Rights Reserved By Carrier Nest @2024
                    </p>
                    <p className="font-light text-lg text-center text-slate-600  text-cener py-4">
                        Got questions? email-us: contactus@carriernest.com
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Homepage;
