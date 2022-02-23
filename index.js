const express = require('express')
const path = require('path')
const cors = require('cors')
const PORT = process.env.PORT || 5000
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

express()
  .use(express.static(path.join(__dirname, 'public')))
   .use(cors())
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
    .get('/', (req, res) => res.render('pages/index'))
    .get('/hellp', (req, res) => res.status(200).send({ file:111 }))
    .post('/api', jsonParser, (req, res) => {
        const figmaRes = {
            fileKey: req.body.fileKey,
            nodeId: req.body.nodeId
        };
        res.status(200).send(figmaRes);
    })
    .post('/webhook', jsonParser, (req, res) => {
        console.log('BODY', req.body)
        res.status(200).send();
    })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
