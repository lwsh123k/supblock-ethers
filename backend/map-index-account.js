// 加密时使用实名用户的公钥, 那么这些信息可以提前存储到服务器中
// 数据库内容包括: fair integer index - account - public key
const { MongoClient } = require('mongodb');

// Replace the uri string with your connection string.
const uri = 'mongodb://localhost:27017';

const client = new MongoClient(uri);

async function run() {
    try {
        const database = client.db('sample_mflix');
        const movies = database.collection('movies');

        // Query for a movie that has the title 'Back to the Future'
        const query = { title: 'Back to the Future' };
        const movie = await movies.findOne(query);

        console.log(movie, 111);
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
run().catch(console.dir);
