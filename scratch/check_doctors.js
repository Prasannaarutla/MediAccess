import { fetchData } from './frontend/src/firebase.js';

async function checkDoctors() {
    const result = await fetchData('doctors');
    console.log(JSON.stringify(result, null, 2));
}

checkDoctors();
