const axios = require('axios');

const auth = {
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
            console.error('Error get auth string:', error.message);
        }
    },
};

export default auth;
