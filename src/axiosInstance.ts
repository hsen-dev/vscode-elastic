import axios from 'axios';

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default axios.create({
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});
