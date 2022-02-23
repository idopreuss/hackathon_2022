const express = require('express')
const path = require('path')
const cors = require('cors')
const PORT = process.env.PORT || 5000
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
const axios = require('axios');

express()
  .use(express.static(path.join(__dirname, 'public')))
   .use(cors())
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
    .get('/', (req, res) => res.render('pages/index'))
    .get('/hello', (req, res) => res.status(200).send({ file:111 }))
    .post('/api', jsonParser, (req, res) => {
        const uri = 'https://api.figma.com/v1/files/' + req.body.fileKey + '/nodes?ids=' + req.body.nodeId;
        console.log(uri);
        axios.get(uri, {
                headers: {
                    'X-FIGMA-TOKEN': '330542-09af815a-1f76-4959-ba3e-e3f62ef22310'
                }
            }
            )
            .then(res => {
                const figmaModel = res.data;
                const rootNodeName = 'Desktop 1440';
                const firstNodeKey = Object.keys(figmaModel.nodes)[0];
                const rootNode = figmaModel.nodes[firstNodeKey].document.children.find(
                    (child) => child.name === rootNodeName
                );

                console.log('Res:',rootNode)

            })
            .catch(err => {
                console.log('Error: ', err.message);
            });
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
