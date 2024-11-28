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
        <section className="relative min-h-screen px-6 m-0 min-w-screen bg-slate-100 sm:px-14">
            <div className="mx-auto max-w-7xl">
                <div className="py-10 px-4 shadow-2xl shadow-slate-50 rounded-b-2xl pb-6 sticky top-0 h-[50px] z-50 bg-slate-100 mb-4   flex flex-row justify-between items-center">
                    <div className="flex flex-row items-center justify-between gap-2 text-lg font-extrabold text-gray-800 underline md:text-3xl underline-offset-2">
                        <Image src={'/logo_truck_100.png'} alt="logo" width={46} height={46} />
                        <p>Carrier Nest</p>
                    </div>
                    <div className="">
                        <button
                            className="p-1 shadow-2xl rounded-xl from-rose-200 via-cyan-400 to-indigo-600 bg-gradient-to-bl"
                            onClick={() => (status === 'authenticated' ? router.push('/') : signIn())}
                        >
                            <span className="block px-4 py-2 text-sm font-black text-white transition rounded-lg bg-cyan-900 hover:bg-transparent hover:text-white">
                                {status === 'authenticated' ? 'Dashboard' : 'Sign In'}
                            </span>
                        </button>
                    </div>
                </div>
                <div className="h-[600px] relative mt-10 flex flex-col flex-1 py-auto justify-around bg-gradient-to-r from-gray-200 to-purple-100 rounded-3xl p-4 mb-5">
                    <div className="flex flex-col flex-1 justify-evenly">
                        <h1 className="flex flex-col text-3xl font-bold leading-snug ">
                            <span className="mb-1 text-5xl font-extrabold text-cyan-700">Trucking Simplified.</span>
                            <span className="pl-2 text-xl font-light text-slate-600">
                                Carrier Nest lets you focus on growing your business. <br></br>We aim to simplify
                                logistics for owner operators & medium sized trucking companies.
                            </span>
                        </h1>
                    </div>
                    <div className="relative top-0 right-0 mx-auto sm:absolute md:m-4 sm:top-0 lg:top-auto sm:m-4 md:flex">
                        <Image src={'/truckbg.png'} alt="logo" width={300} height={75} className="rounded-xl" />
                    </div>
                </div>
                <div className="flex flex-col w-full py-16">
                    <h1 className="w-full mb-10 text-3xl font-black text-center text-orange-700">App Features</h1>
                    <div
                        className="grid gap-16 grid-col-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
                        key={'featurecontainer'}
                    >
                        {appFeatures.map((feature, index) => (
                            <div
                                key={index}
                                className="items-center justify-around px-8 py-10 text-sm font-bold text-center border shadow-md bg-slate-200 text-slate-500 border-slate-100 rounded-3xl"
                            >
                                <div>
                                    <p className="mb-2 text-lg font-base text-cyan-900">{feature.name}</p>
                                    <p className="text-sm font-light text-slate-500">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="relative flex flex-col justify-between w-full h-full my-12 text-center rounded-3xl md:flex-row">
                    <h1 className="flex-1 p-4 my-auto mr-10 text-3xl font-black text-center border-0 w-fit text-cyan-800 bg-slate-100 border-slate-400 rounded-2xl">
                        App Dashboard Overview
                    </h1>
                    <div className="w-full mx-0">
                        <Image
                            src={'/dashboard.png'}
                            alt="App dashboard overview"
                            height={0}
                            width={0}
                            sizes="100vw"
                            className="border-4 rounded-3xl border-slate-300 "
                            style={{ width: 'auto', height: 'auto', margin: 'auto' }}
                        />
                    </div>
                </div>
                <article className="sm:p-1.5 mx-auto my-24 w-full rounded-3xl bg-gradient-to-r from-rose-400 via-cyan-600 to-purple-400">
                    <div className="flex flex-col items-center justify-center p-4 py-40 text-center bg-slate-100 rounded-2xl">
                        <h4 className="text-5xl font-bold">Get Started with Carrier Nest Today!</h4>

                        <p className="max-w-lg mt-4 text-lg font-light text-center text-slate-400 w text-cener">
                            Carrier Nest isn&#39;t just a management system; it&#39;s a partner in your success. Our
                            dedicated support team is here to assist you every step of the way, ensuring you get the
                            most out of our system. Join the growing number of trucking companies that trust Carrier
                            Nest to keep their operations running smoothly. Experience the future of trucking management
                            today.
                        </p>
                        <button
                            className="p-1 shadow-2xl mt-14 rounded-xl from-rose-200 via-cyan-400 to-indigo-600 bg-gradient-to-bl"
                            onClick={() => (status === 'authenticated' ? router.push('/') : signIn())}
                        >
                            <span className="block px-4 py-2 text-xl font-black text-white transition rounded-lg bg-cyan-900 hover:bg-transparent hover:text-white">
                                Start free trial
                            </span>
                        </button>
                    </div>
                </article>
                <div className="flex flex-col-reverse justify-between p-4 h-fit md:flex-row bg-slate-200 rounded-t-2xl">
                    <p className="py-4 text-lg font-light text-center text-slate-400">
                        All Rights Reserved By Carrier Nest @2024
                    </p>
                    <p className="py-4 text-lg font-light text-center text-slate-600">
                        Got questions? email-us: carriernestapp@gmail.com
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Homepage;
