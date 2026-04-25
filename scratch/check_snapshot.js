
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5003/api'; // Corrected port

async function checkSnapshot() {
  try {
    const res = await axios.get(`${API_URL}/payroll/snapshot/24-25/CDE094`);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.message);
  }
}

checkSnapshot();
