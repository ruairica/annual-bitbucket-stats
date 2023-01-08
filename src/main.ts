import axios from 'axios';
import { toBase64 } from './helper.js';
import { PullRequest } from './types.js';
const userName = 'ruairicaldwell';
const password = '';

console.log('hi');
const config = {
    headers: {
        Authorization: `Basic ${toBase64(`${userName}:${password}`)}`,
    },
};

async function getData() {
    const response = await axios.get<PullRequest>(
        `https://api.bitbucket.org/2.0/repositories/esosolutions/inventory/pullrequests/2336`,
        config
    );
    return response.data;
}

const resp = await getData();
console.log(JSON.stringify(resp));
