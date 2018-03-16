# ethercalc-client
A simple API client for Ethercalc collaborative spreadsheets.

# Useage

You need to have [Ethercalc](https://github.com/audreyt/ethercalc) up and running for this to be useful. Follow the instructions in that repository to set it up, then create a new client:

```javascript
const Ethercalc = require('ethercalc-client');

const ethercalc = new Ethercalc('localhost', '8000');
```

Creating a room from an existing socialcalc snapshot (with a random URL):

```javascript
const room = ethercalc.createRoom(null, `socialcalc:version:1.0
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary=SocialCalcSpreadsheetControlSave
--SocialCalcSpreadsheetControlSave
Content-type: text/plain; charset=UTF-8

# SocialCalc Spreadsheet Control Save
version:1.0
part:sheet
part:edit
part:audit
--SocialCalcSpreadsheetControlSave
Content-type: text/plain; charset=UTF-8

version:1.5
cell:A1:t:Hello world!
sheet:c:1:r:1:tvf:1
valueformat:1:text-wiki
--SocialCalcSpreadsheetControlSave
Content-type: text/plain; charset=UTF-8

version:1.0
rowpane:0:1:1
colpane:0:1:1
ecell:A1
--SocialCalcSpreadsheetControlSave
Content-type: text/plain; charset=UTF-8

--SocialCalcSpreadsheetControlSave--
`);
```

Fetching a socialcalc snapshot for a room:

```javascript
const room = ethercalc.getRoom('room-name');
```

Fetching a list of existing rooms:

```javascript
const rooms = ethercalc.listRooms();
```

# Test

TODO
