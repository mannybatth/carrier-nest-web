import * as admin from 'firebase-admin';
import serviceAccount from '../../carriernest-1015e46ce1b5.json';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
}

export default admin;
