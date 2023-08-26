import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect } from 'react';

const VerifyRequest: React.FC = () => {
    useEffect(() => {
        document.documentElement.classList.add('h-full');
        return () => {
            document.documentElement.classList.remove('h-full');
        };
    }, []);

    return (
        <div className="flex flex-1 min-h-full">
            <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
                <div className="w-full max-w-sm mx-auto lg:w-96">
                    <div>
                        <Image
                            src="/logo_truck.svg"
                            alt="Logo"
                            width={100}
                            height={72}
                            className="w-[100px] mb-4"
                        ></Image>
                        <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-gray-900">
                            Check your email
                        </h2>
                    </div>

                    <div className="mt-5 space-y-4">
                        <p className="text-base leading-6">A sign in link has been sent to your email address.</p>
                        <div>
                            <Link href="/auth/signin">
                                <button className="flex w-full justify-center rounded-md bg-orange-800 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-800">
                                    Return to sign in
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative flex-1 hidden w-0 lg:block">
                <img
                    className="absolute inset-0 object-cover w-full h-full"
                    style={{ objectPosition: '40% 50%' }}
                    src="/cover.png"
                    alt=""
                />
            </div>
        </div>
    );
};

export default VerifyRequest;
