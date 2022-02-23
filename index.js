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
                console.log('Res:',res.data)
                console.log(convertFromFigmaToFlex(res.data));


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

// @Ido - TODO - replace this map with the response from Figma's fills API
const imageRefToS3 = {
    '795f4d1768e5f1609eecb76161a6f573e8001dc4': 'url1',
};
const idSelectorPlaceholder = '<id>';
function convertFromFigmaToFlex(figmaModel) {
    const section = createSection();
    const flexSection = {
        id: generateId('section_wrapper'),
        data: {},
        structureState: {
            elements: {
                [section.element.id]: section.element,
            },
        },
        styleState: {
            styles: {
                desktop: {},
                adjustments_for_tablet: {},
                tablet: {},
                desktop_wide: {},
                inherited_from_desktop: {},
                mobile_portrait: {},
                mobile_landscape: {},
            },
            breakpointPriority: [
                'desktop',
                'adjustments_for_tablet',
                'tablet',
                'desktop_wide',
                'inherited_from_desktop',
                'mobile_portrait',
                'mobile_landscape',
            ],
        },
    };
    const gridNames = [
        'about- section 2',
        'the gist- section 3',
        'agenda- section 4',
        'judges- section 5',
        'prizes- section 6',
    ];
    const firstNodeKey = Object.keys(figmaModel.nodes)[0];
    const rootNode = figmaModel.nodes[firstNodeKey].document;
    gridNames.forEach((gridName) => {
        addGridToSection({ gridName, rootNode, section, flexSection });
    });

    return flexSection;
}
// ---- MAIN LOGIC --------
function addGridToSection({ gridName, rootNode, section, flexSection }) {
    const gridNode = rootNode.children.find((child) => child.name === gridName);
    const grid = createGrid({ node: gridNode, section });
    filterBackgroundNodeFromGrid(gridNode);
    addElementToModel({
        flexSection,
        elementToAdd: grid,
        parentId: section.element.id,
    });
    const gridWidgetNodes = getWidgetNodesOfGrid(gridNode);
    addWidgetsToGrid({ flexSection, grid, gridNode, gridWidgetNodes });
}
function addWidgetsToGrid({ flexSection, grid, gridNode, gridWidgetNodes }) {
    const gridOffset = findGridOffset(gridNode);
    gridWidgetNodes.forEach((widgetNode) => {
        const widgetId = `widget_${widgetNode.id}`;
        const widget = createWidget({
            widgetId,
            widgetNode,
            parentId: grid.element.id,
            gridOffset,
        });
        addElementToModel({
            flexSection,
            elementToAdd: widget,
            parentId: grid.element.id,
        });
    });
}
// ---- CREATE ELEMENTS HELPERS --------
function createSection() {
    const sectionId = generateId('section');
    const element = {
        id: sectionId,
        parentId: null,
        children: [],
        type: 'section',
        name: '',
        data: {},
        dataExtension: null,
    };
    return { element };
}
function createGrid({ node, section }) {
    const gridId = `grid_${node.id}`;
    const element = {
        id: gridId,
        parentId: section.element.id,
        children: [],
        type: 'grid',
        name: '',
        data: {},
        dataExtension: null,
    };
    const color = node.children.find(
        (childNode) => childNode.type === 'RECTANGLE'
    ).fills[0].color;
    const backgroundColor = decimalColorToString(color);
    const style = {
        'background-size': 'cover',
        'background-repeat': 'no-repeat',
        'background-position': '50% 50%',
        display: 'grid',
        'justify-content': 'start',
        'align-items': 'start',
        position: 'relative',
        'grid-template-columns': 'repeat(1, minmax(0px, 1fr))',
        'grid-template-rows': `minmax(${node.absoluteBoundingBox.height}px, max-content)`,
        'column-gap': '0px',
        'row-gap': '0px',
        'padding-left': 'calc((100% - 1200px) / 2)',
        'padding-right': 'calc((100% - 1200px) / 2)',
        'background-color': backgroundColor,
    };
    return { element, style };
}
function createWidget({ widgetId, widgetNode, parentId, gridOffset }) {
    const widgetType = getWidgetType(widgetNode);
    let imageUrl;
    if (widgetType === 'image') {
        const imageRef = widgetNode.fills[0].imageRef;
        imageUrl = imageRefToS3[imageRef];
    }
    const element = {
        id: widgetId,
        parentId: parentId,
        children: [],
        type: 'widget_wrapper',
        externalId: '?????????????????????????????????????',
        name: widgetType,
        data: {
            'data-widget-type': widgetType,
            content: widgetNode.name,
            style: widgetNode.style,
            imageUrl,
        },
        dataExtension: null,
    };
    const style = {
        position: 'relative',
        width: `${widgetNode.absoluteBoundingBox.width}px`,
        height: `${widgetNode.absoluteBoundingBox.height}px`,
        'min-width': '10px',
        'min-height': '10px',
        'margin-top': `${widgetNode.absoluteBoundingBox.y + gridOffset.top}px`,
        'margin-bottom': '0px',
        'margin-right': '0px',
        'margin-left': `${
            widgetNode.absoluteBoundingBox.x + gridOffset.left
        }px`,
        'justify-self': 'start',
        'align-self': 'start',
        'grid-column-start': '1',
        'grid-column-end': 'span 1',
        'grid-row-start': '1',
        'grid-row-end': 'span 1',
        'max-width': '100%',
    };
    return { element, style };
}
// ---- LOGIC HELPERS --------
function filterBackgroundNodeFromGrid(gridNode) {
    gridNode.children = gridNode.children.filter(
        (childNode) => childNode.type !== 'RECTANGLE'
    );
}
function getWidgetNodesOfGrid(node) {
    let children = [];
    node.children.forEach((childNode) => {
        if (childNode.type === 'FRAME' || childNode.type === 'GROUP') {
            const subChildren = getWidgetNodesOfGrid(childNode);
            children = [...children, ...subChildren];
        } else if (childNode.type === 'ELLIPSE') {
            // do nothing
        } else {
            children.push(childNode);
        }
    });
    return children;
}
function findGridOffset(gridNode) {
    let left = 0 - gridNode.absoluteBoundingBox.x;
    let top = 0 - gridNode.absoluteBoundingBox.y;
    return { top, left };
}
function addElementToModel({ flexSection, elementToAdd, parentId }) {
    flexSection.structureState.elements[parentId].children.push(
        elementToAdd.element.id
    );
    flexSection.structureState.elements[elementToAdd.element.id] =
        elementToAdd.element;
    flexSection.styleState.styles.desktop[elementToAdd.element.id] = {
        [idSelectorPlaceholder]: elementToAdd.style,
    };
}
function getWidgetType(node) {
    if (node.type === 'RECTANGLE' && node.fills?.[0]?.imageRef) {
        return 'image';
    }
    if (node.type === 'TEXT') {
        return 'text';
    }
    if (node.type === 'COMPONENT') {
        return 'button';
    }
    return 'unknown type';
}
// ---- GENERAL HELPERS --------
function generateId(prefix, size = 3) {
    return `${prefix.toLowerCase()}_${Math.random()
        .toString(32)
        .slice(2, 2 + size)}`;
}
function decimalColorToString(decimalColor) {
    return `rgba(${Math.round(255 * decimalColor.r)}, ${Math.round(
        255 * decimalColor.g
    )}, ${Math.round(255 * decimalColor.b)}, ${decimalColor.a})`;
}
