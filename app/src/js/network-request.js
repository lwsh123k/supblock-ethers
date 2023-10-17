const axios = require('axios');

// 该部分主要用于网络请求部分
const NetworkRequest = {
    serverURL: 'http://localhost:3000',
    authString: null,
    // Generate UUID and store it on the server
    async getAuthString(address) {
        try {
            let response = await axios.post(`${this.serverURL}/getAuthString`, {
                address: address,
            });
            this.authString = response.data.message;
            // console.log(this.authString);
            return this.authString;
        } catch (error) {
            console.error(error.message);
        }
    },

    async getAccountInfo(index) {
        try {
            let response = await axios.post(`${this.serverURL}/getAccountInfo`, {
                index: index,
            });
            let info = response.data;
            return info;
        } catch (error) {
            console.error(error.message);
        }
    },
};

export default NetworkRequest;
