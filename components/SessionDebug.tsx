import { useSession } from 'next-auth/react';
import React from 'react';

const SessionDebug: React.FC = () => {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">Loading session...</div>;
    }

    if (status === 'unauthenticated') {
        return <div className="p-4 bg-red-100 border border-red-400 rounded">Not authenticated - please log in</div>;
    }

    return (
        <div className="p-4 bg-blue-100 border border-blue-400 rounded">
            <h3 className="font-bold mb-2">Session Debug Info:</h3>
            <pre className="text-xs overflow-auto">{JSON.stringify(session, null, 2)}</pre>
        </div>
    );
};

export default SessionDebug;
