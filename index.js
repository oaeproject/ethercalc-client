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

import fs from 'fs';
import axios from 'axios';
import qs from 'qs';

const DEFAULT_SNAPSHOT = '...';
const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 8000;
const DEFAULT_PROTOCOL = 'http';
const DEFAULT_TIMEOUT = 2500;

const SOCIALCALC = 'socialcalc';
const XLSX = 'xlsx';
const CSV = 'csv';

// Use the default Ethercalc host & port if none are provided
function Ethercalc(
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  protocol = DEFAULT_PROTOCOL,
  timeout = DEFAULT_TIMEOUT,
) {
  this.instance = axios.create({
    baseURL: `${protocol}://${host}:${port}`,
    timeout,
  });
}

Ethercalc.prototype.getRoom = async function(room) {
  try {
    const response = await this.instance.get(`/_/${room}`);
    return response.data;
    // This returns the socialcalc snapshot for the room
    // See https://github.com/marcelklehr/socialcalc/blob/master/js/socialcalc-3.js#L367
    // for description of the format and acceptable values
  } catch (error) {
    // If we get a response with the error, send back the status info
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    // Otherwise just return the error
    return error;
  }
};

Ethercalc.prototype.createRoom = async function(room, snapshot) {
  // Creating a room might take a bit longer so increase timeout
  const timeout = {
    timeout: 10000,
  };
  let response = null;

  if (room) {
    try {
      response = await this.instance.post(
        `/_/${room}`,
        qs.stringify({
          room,
          snapshot,
        }),
        timeout,
      );
      return response.data;
      // If room ID was included, this will be an ethercalc command
    } catch (error) {
      if (error.response) {
        return {
          status: error.response.status,
          message: error.response.statusText,
        };
      }

      return error;
    }
  }

  // If we have no room ID, just create a new room
  snapshot = snapshot || DEFAULT_SNAPSHOT;
  try {
    response = await this.instance.post(
      '/_',
      qs.stringify({
        snapshot,
      }),
      timeout,
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

Ethercalc.prototype.overwrite = async function(room, snapshot, type) {
  const conf = {
    headers: {},
  };

  if (type === SOCIALCALC) {
    conf.headers = {
      'Content-Type': 'text/x-socialcalc',
    };
  } else if (type === XLSX) {
    conf.headers = {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  } else if (type === CSV) {
    conf.headers = {
      'Content-Type': 'text/csv',
    };
  } else {
    return new Error('Format must be one of socialcalc, xlsx or csv!');
  }

  try {
    const response = await this.instance.put(
      `/_/${room}`,
      Buffer.from(snapshot),
      conf,
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

Ethercalc.prototype.createRoomFromCSVFile = async function(path) {
  try {
    const response = await this.instance.post(
      '/_/',
      fs.createReadStream(path),
      {
        headers: {
          // Content type is csv
          'Content-Type': 'text/csv',
        },
      },
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

Ethercalc.prototype.deleteRoom = async function(room) {
  try {
    const response = await this.instance.delete(`/_/${room}`);
    // If the response status is successful the room was deleted
    if (response) return true;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

Ethercalc.prototype.roomExists = async function(room) {
  try {
    const response = await this.instance.get(`/_exists/${room}`);
    if (response) return response.data;
  } catch (error) {
    return false;
  }
};

Ethercalc.prototype.exportRoom = async function(room, type) {
  type = type.toLowerCase();
  // Default to csv if type is not defined or is invalid
  type =
    type === 'csv.json' || type === XLSX || type === 'md' || type === 'html'
      ? type
      : CSV;

  try {
    const response = await this.instance.get(`/_/${room}/${type}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

Ethercalc.prototype.listRooms = async function() {
  try {
    const response = await this.instance.get('/_rooms');
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

Ethercalc.prototype.postCommand = async function(room, command) {
  // An Ethercalc 'command' is a string or array of strings that correspond(s)
  // to spreadsheet actions. Command format is `set A1 value n 1` or `set A2
  // text t test` (action `set` coordinate `A1/A2` type `value n/text t` value
  // `1/test`)
  try {
    const response = await this.instance.post(
      `/_/${room}`,
      qs.stringify({command}),
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

Ethercalc.prototype.appendRowsFromCSVFile = async function(room, path) {
  try {
    const response = await this.instance.post(
      `/_/${room}`,
      fs.createReadStream(path),
      {
        headers: {
          'Content-Type': 'text/csv',
        },
      },
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

Ethercalc.prototype.getCells = async function(room) {
  try {
    const response = await this.instance.get(`/_/${room}/cells`);
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

Ethercalc.prototype.getCellValue = async function(room, coord) {
  try {
    const response = await this.instance.get(`/_/${room}/cells/${coord}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

Ethercalc.prototype.getHTML = async function(room) {
  try {
    const response = await this.instance.get(`/_/${room}/html`);
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

Ethercalc.prototype.getCSV = async function(room) {
  try {
    const response = await this.instance.get(`/_/${room}/csv`);
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

Ethercalc.prototype.getJSON = async function(room) {
  try {
    const response = await this.instance.get(`/_/${room}/csv.json`);
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.statusText,
      };
    }

    return error;
  }
};

export default Ethercalc;
