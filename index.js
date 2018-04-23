/*!
 * Licensed under the Educational Community License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

const axios = require('axios');
const fs = require('fs');
const qs = require('qs');

// Use the default Ethercalc host & port if none are provided
function Ethercalc(host = 'localhost', port = '8000') {
    this.instance = axios.create({
        baseURL: `http://${host}:${port}`,
        timeout: 2500
    });
}

Ethercalc.prototype.getRoom = function(room) {
    return this.instance.get(`/_/${room}`)
    .then(response => {
        // This returns the socialcalc snapshot for the room
        // See https://github.com/marcelklehr/socialcalc/blob/master/js/socialcalc-3.js#L367
        // for description of the format and acceptable values
        return response.data;
    })
    .catch(error => {
        // If we get a response with the error, send back the status info
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.statusText
            };
        } else {
            // Otherwise just return the error
            return error;
        }
    });
};

Ethercalc.prototype.createRoom = function(room, snapshot) {
    // Creating a room might take a bit longer so increase timeout
    const timeout = {
        timeout: 10000
    };
    if (room) {
        return this.instance.post(`/_/${room}`, qs.stringify({
            room: room,
            snapshot: snapshot
        }), timeout)
        .then(response => {
            // If room ID was included, this will be an ethercalc command
            return response.data;
        })
        .catch(error => {
            if (error.response) {
                return {
                    status: error.response.status,
                    message: error.response.statusText
                };
            } else {
                return error;
            }
        });
    } else {
        // If we have no room ID, just create a new room
        return this.instance.post('/_', qs.stringify({
            snapshot: snapshot
        }), timeout)
        .then(response => {
            // Since there was no ID, a new ID/URL for the room will be returned
            return response.data;
        })
        .catch(error => {
            if (error.response) {
                return {
                    status: error.response.status,
                    message: error.response.statusText
                };
            } else {
                return error;
            }
        });
    }
};

Ethercalc.prototype.overwrite = function(room, snapshot, type) {
    let conf = {
        headers: {}
    };
    if (type === 'socialcalc') {
        conf.headers = {
            'Content-Type':'text/x-socialcalc'
        };
    } else if (type === 'xlsx') {
        conf.headers = {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
    } else  if (type === 'csv') {
        conf.headers = {
            'Content-Type': 'text/csv'
        };
    } else {
        return new Error('Format must be one of socialcalc, xlsx or csv!');
    }

    return this.instance.put(`/_/${room}`, Buffer.from(snapshot), conf)
    .then(response => {
        return response.data;
    })
    .catch(error => {
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.statusText
            };
        } else {
            return error;
        }
    });
};

Ethercalc.prototype.createRoomFromCSVFile = function(path) {
    return this.instance.post('/_/', fs.createReadStream(path), {
        headers: {
            // Content type is csv
            'Content-Type': 'text/csv'
        }
    })
    .then(response => {
        return response.data;
    })
    .catch(error => {
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.statusText
            };
        } else {
            return error;
        }
    });
};

Ethercalc.prototype.deleteRoom = function(room) {
    return this.instance.delete(`/_/${room}`)
    // If the response status is successful the room was deleted
    .then(response => {
        return true;
    })
    .catch(error => {
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.statusText
            };
        } else {
            return error;
        }
    });
};

Ethercalc.prototype.roomExists = function(room) {
    return this.instance.get(`/_exists/${room}`)
    .then(response => {
        return response.data;
    })
    .catch(error => {
        return false;
    });
};

Ethercalc.prototype.exportRoom = function(room, type) {
    type = type.toLowerCase();
    // Default to csv if type is not defined or is invalid
    type = (type === 'csv.json' || type === 'xlsx' || type === 'md' || type === 'html') ? type : 'csv';
    return this.instance.get(`/_/${room}/${type}`)
    .then(response => {
        return response.data;
    })
    .catch(error => {
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.statusText
            };
        } else {
            return error;
        }
    });
};

Ethercalc.prototype.listRooms = function() {
    return this.instance.get('/_rooms')
    .then(response => {
        return response.data;
    })
    .catch(error => {
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.statusText
            };
        } else {
            return error;
        }
    });
};

Ethercalc.prototype.postCommand = function(room, command) {
    // An Ethercalc 'command' is a string or array of strings that correspond(s)
    // to spreadsheet actions. Command format is `set A1 value n 1` or `set A2
    // text t test` (action `set` coordinate `A1/A2` type `value n/text t` value
    // `1/test`)
    return this.instance.post(`/_/${room}`, qs.stringify({'command': command}))
    .then(response => {
        return response.data;
    })
    .catch(error => {
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.statusText
            };
        } else {
            return error;
        }
    });
};

Ethercalc.prototype.appendRowsFromCSVFile = function(room, path) {
    return this.instance.post(`/_/${room}`, fs.createReadStream(path), {
        headers: {
          'Content-Type': 'text/csv'
        }
    })
    .then(response => {
        return response.data;
    })
    .catch(error => {
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.statusText
            };
        } else {
            return error;
        }
    });
};

Ethercalc.prototype.getCells = function(room) {
    return this.instance.get(`/_/${room}/cells`)
    .then(response => {
        return response.data;
    })
    .catch(error => {
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.statusText
            };
        } else {
            return error;
        }
    });
};

Ethercalc.prototype.getCellValue = function(room, coord) {
    return this.instance.get(`/_/${room}/cells/${coord}`)
    .then(response => {
        return response.data;
    })
    .catch(error => {
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.statusText
            };
        } else {
            return error;
        }
    });
};

Ethercalc.prototype.getHTML = function(room) {
    return this.instance.get(`/_/${room}/html`)
    .then(response => {
        return response.data;
    })
    .catch(error => {
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.statusText
            };
        } else {
            return error;
        }
    });
};

module.exports = Ethercalc;
