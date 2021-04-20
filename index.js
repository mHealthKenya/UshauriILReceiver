const express = require("express");
const moment = require("moment");
const db = require("./dbconnection.js"); //reference of dbconnection.js
//let stringify = require('json-stringify-safe');

var bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true}));

const _ = require("lodash");

//Importing models
const Op = require('sequelize').Op;
const {
    Client
} = require("./models/client");
const {
    Partner
} = require("./models/partner");
const {
    Appointment
} = require("./models/appointment");

//app.use(express.json());
//app.use(express.urlencoded());
app.post("/hl7_message", async (req, res) => {

    let obj1 = req;
    jsonObj = obj1.body;

    //console.log(jsonObj);

    var DATE_TODAY = moment(new Date()).format("YYYY-MM-DD");

    var message_type = jsonObj.MESSAGE_HEADER.MESSAGE_TYPE;
    var SENDING_APPLICATION = jsonObj.MESSAGE_HEADER.SENDING_APPLICATION;
    var MESSAGE_DATETIME = jsonObj.MESSAGE_HEADER.MESSAGE_DATETIME;
    let response;

    //only post KENYAEMR and ADT appointments and clients

    if (SENDING_APPLICATION === 'KENYAEMR' || SENDING_APPLICATION === 'ADT') {

        if (message_type == "ADT^A04") {

            //this message is triggered when a new client is created
            var GODS_NUMBER = jsonObj.PATIENT_IDENTIFICATION.EXTERNAL_PATIENT_ID.ID;
            var CCC_NUMBER;
            var PATIENT_CLINIC_NUMBER;
            var FIRST_NAME = jsonObj.PATIENT_IDENTIFICATION.PATIENT_NAME.FIRST_NAME;
            var MIDDLE_NAME = jsonObj.PATIENT_IDENTIFICATION.PATIENT_NAME.MIDDLE_NAME;
            var LAST_NAME = jsonObj.PATIENT_IDENTIFICATION.PATIENT_NAME.LAST_NAME;
            var DATE_OF_BIRTH = jsonObj.PATIENT_IDENTIFICATION.DATE_OF_BIRTH;
            var SEX;
            var PHONE_NUMBER = jsonObj.PATIENT_IDENTIFICATION.PHONE_NUMBER;
            var MARITAL_STATUS;
            var PATIENT_SOURCE = jsonObj.PATIENT_VISIT.SENDING_APPLICATION;
            var ENROLLMENT_DATE = jsonObj.PATIENT_VISIT.HIV_CARE_ENROLLMENT_DATE;
            var PATIENT_TYPE = jsonObj.PATIENT_VISIT.PATIENT_TYPE;
            var SENDING_FACILITY;
            var GROUP_ID;
            var COUNTY = jsonObj.PATIENT_IDENTIFICATION.PATIENT_ADDRESS.PHYSICAL_ADDRESS.COUNTY;
            var SUB_COUNTY = jsonObj.PATIENT_IDENTIFICATION.PATIENT_ADDRESS.PHYSICAL_ADDRESS.SUB_COUNTY;
            var WARD = jsonObj.PATIENT_IDENTIFICATION.PATIENT_ADDRESS.PHYSICAL_ADDRESS.WARD;
            var VILLAGE = jsonObj.PATIENT_IDENTIFICATION.PATIENT_ADDRESS.PHYSICAL_ADDRESS.VILLAGE;
            var ART_DATE;

            var result = get_json(jsonObj);

            console.log(result);

            for (var i = 0; i < result.length; i++) {
                var key = result[i].key;
                var value = result[i].value;

                if (key == "DATE_OF_BIRTH") {
                    var DoB = DATE_OF_BIRTH;

                    var year = DoB.substring(0, 4);
                    var month = DoB.substring(4, 6);
                    var day = DoB.substring(6, 8);

                    var today = DATE_TODAY;

                    var new_date = year + "-" + month + "-" + day;
                    var date_diff = moment(today).diff(
                        moment(new_date).format("YYYY-MM-DD"),
                        "days"
                    );

                    if (date_diff >= 5475 && date_diff <= 6935) {
                        GROUP_ID = "2";
                    }
                    if (date_diff >= 7300) {
                        GROUP_ID = "1";
                    }
                    if (date_diff <= 5110) {
                        GROUP_ID = "6";
                    }
                } else if (key == "SEX") {
                    if (result[i].value == "F") {
                        SEX = "1";
                    } else {
                        SEX = "2";
                    }
                } else if (key == "MARITAL_STATUS") {
                    if (result[i].value === "") {
                        MARITAL_STATUS = "1";
                    }
                    if (result[i].value == "D") {
                        MARITAL_STATUS = "3";
                    } else if (result[i].value == "M") {
                        MARITAL_STATUS = "2";
                    } else if (result[i].value == "S") {
                        MARITAL_STATUS = "1";
                    } else if (result[i].value == "W") {
                        MARITAL_STATUS = "4";
                    } else if (result[i].value == "C") {
                        MARITAL_STATUS = "5";
                    } else if (result[i].value == "1") {
                        MARITAL_STATUS = "1";
                    } else if (result[i].value == "2") {
                        MARITAL_STATUS = "2";
                    } else if (result[i].value == "3") {
                        MARITAL_STATUS = "3";
                    } else if (result[i].value == "4") {
                        MARITAL_STATUS = "4";
                    } else if (result[i].value == "5") {
                        MARITAL_STATUS = "5";
                    } else {
                        MARITAL_STATUS = "1";
                    }
                }
                if (key == "SENDING_FACILITY") {
                    SENDING_FACILITY = result[i].value;
                }
                if (key == "ID") {
                    if (result[i + 1].value == "CCC_NUMBER") {
                        CCC_NUMBER = result[i].value;
                    }
                }

                if (key == "ID") {
                    if (result[i + 1].value == "PATIENT_CLINIC_NUMBER") {
                        PATIENT_CLINIC_NUMBER = result[i].value;
                    }
                }

                if (key == "OBSERVATION_DATETIME") {
                    if (result[i + 5].value == "CURRENT_REGIMEN") {
                        ART_DATE = result[i].value;
                    }
                }
            }

            var enroll_year = ENROLLMENT_DATE.substring(0, 4);
            var enroll_month = ENROLLMENT_DATE.substring(4, 6);
            var enroll_day = ENROLLMENT_DATE.substring(6, 8);
            var new_enroll_date = enroll_year + "-" + enroll_month + "-" + enroll_day;

            if (ART_DATE === "" || ART_DATE === undefined) {

                var new_art_date = null;

            } else {

                var art_year = ART_DATE.substring(0, 4);
                var art_month = ART_DATE.substring(4, 6);
                var art_day = ART_DATE.substring(6, 8);
                var new_art_date = art_year + "-" + art_month + "-" + art_day;

            }

            if (CCC_NUMBER.length != 10 || isNaN(CCC_NUMBER)) {
                response = `Invalid CCC Number: ${CCC_NUMBER}`;
                console.log(response);
                return;
            }
            console.log("ndani 2");
            let client = await Client.findOne({
                where: {
                    phone_no: PHONE_NUMBER
                }
            });

            if (!_.isEmpty(client))
                return res
                    .status(400)
                    .json({
                        success: false,
                        message: `Phone number: ${PHONE_NUMBER} already exists in the system.`
                    });

            let partner = await Partner.findOne({
                where: {
                    mfl_code: SENDING_FACILITY
                }
            });

            if (_.isEmpty(partner))
                return res
                    .status(404)
                    .json({
                        status: false,
                        message: `MFL CODE: ${SENDING_FACILITY} does not exist in system.`
                    });

            client = {
                group_id: parseInt(GROUP_ID),
                clinic_number: CCC_NUMBER,
                f_name: FIRST_NAME,
                m_name: MIDDLE_NAME,
                l_name: LAST_NAME,
                dob: new_date,
                phone_no: PHONE_NUMBER,
                partner_id: partner.partner_id,
                mfl_code: parseInt(SENDING_FACILITY),
                // status: ,
                // client_status: Sequelize.ENUM("ART", "Pre-Art", "On Care", "No Condition"),
                gender: parseInt(SEX),
                marital: MARITAL_STATUS,
                enrollment_date: new_enroll_date,
                art_date: new_art_date,
                client_type: PATIENT_TYPE,
                gods_number: GODS_NUMBER,
                patient_source: PATIENT_SOURCE,
                file_no: PATIENT_CLINIC_NUMBER,
                locator_county: COUNTY,
                locator_sub_county: SUB_COUNTY,
                locator_ward: WARD,
                locator_village: VILLAGE,
                sending_application: SENDING_APPLICATION
            }
            console.log(client);

            await Client.create(client)
                .then(function (model) {
                    message = "OK";
                    response = "Client successfully added.";

                    return res.json({
                        message: message,
                        response: {
                            msg: response,
                            client: _.pick(client, [
                                "id",
                                "f_name",
                                "m_name",
                                "l_name",
                                "dob",
                                "phone_no",
                                "email",
                                "partner_id",
                                "facility_id",
                                "status",
                                "clinic_id",
                                "createdAt"
                            ])
                        }
                    });
                })
                .catch(function (err) {
                    code = 500;
                    response = err.message;
                    console.error(err);

                    return res.status(400).json({
                        response: {
                            msg: response,
                            errors: err.errors
                        }
                    });
                });

        } else if (message_type == "ADT^A08") {

            //this message is triggered by creating an art start date or death

            var FIRST_NAME = jsonObj.PATIENT_IDENTIFICATION.PATIENT_NAME.FIRST_NAME;
            var MIDDLE_NAME = jsonObj.PATIENT_IDENTIFICATION.PATIENT_NAME.MIDDLE_NAME;
            var LAST_NAME = jsonObj.PATIENT_IDENTIFICATION.PATIENT_NAME.LAST_NAME;
            var SEX;
            var PHONE_NUMBER = jsonObj.PATIENT_IDENTIFICATION.PHONE_NUMBER;
            var MARITAL_STATUS;
            var PATIENT_SOURCE = jsonObj.PATIENT_VISIT.SENDING_APPLICATION;
            var ENROLLMENT_DATE = jsonObj.PATIENT_VISIT.HIV_CARE_ENROLLMENT_DATE;
            var COUNTY = jsonObj.PATIENT_IDENTIFICATION.PATIENT_ADDRESS.PHYSICAL_ADDRESS.COUNTY;
            var SUB_COUNTY = jsonObj.PATIENT_IDENTIFICATION.PATIENT_ADDRESS.PHYSICAL_ADDRESS.SUB_COUNTY;
            var WARD = jsonObj.PATIENT_IDENTIFICATION.PATIENT_ADDRESS.PHYSICAL_ADDRESS.WARD;
            var VILLAGE = jsonObj.PATIENT_IDENTIFICATION.PATIENT_ADDRESS.PHYSICAL_ADDRESS.VILLAGE;

            var SENDING_FACILITY;
            var PATIENT_CLINIC_NUMBER;
            var ART_DATE;
            var GROUP_ID;
            var DATE_OF_BIRTH = jsonObj.PATIENT_IDENTIFICATION.DATE_OF_BIRTH;
            var PATIENT_TYPE = jsonObj.PATIENT_VISIT.PATIENT_TYPE;
            var GODS_NUMBER = jsonObj.PATIENT_IDENTIFICATION.EXTERNAL_PATIENT_ID.ID;
            var CCC_NUMBER;
            var TOD_DATE = moment().format("YYYY-MM-DD");

            var result = get_json(jsonObj);

            for (var i = 0; i < result.length; i++) {
                var key = result[i].key;
                var value = result[i].value;

                if (key == "DATE_OF_BIRTH") {
                    var DoB = DATE_OF_BIRTH;

                    var year = DoB.substring(0, 4);
                    var month = DoB.substring(4, 6);
                    var day = DoB.substring(6, 8);

                    var today = DATE_TODAY;

                    var new_date = year + "-" + month + "-" + day;
                    var date_diff = moment(today).diff(
                        moment(new_date).format("YYYY-MM-DD"),
                        "days"
                    );

                    if (date_diff >= 5475 && date_diff <= 6935) {
                        GROUP_ID = "2";
                    }
                    if (date_diff >= 7300) {
                        GROUP_ID = "1";
                    }
                    if (date_diff <= 5110) {
                        GROUP_ID = "6";
                    }
                } else if (key == "SEX") {
                    if (result[i].value == "F") {
                        SEX = "1";
                    } else {
                        SEX = "2";
                    }
                } else if (key == "MARITAL_STATUS") {
                    if (result[i].value === "") {
                        MARITAL_STATUS = "1";
                    }
                    if (result[i].value == "D") {
                        MARITAL_STATUS = "3";
                    } else if (result[i].value == "M") {
                        MARITAL_STATUS = "2";
                    } else if (result[i].value == "S") {
                        MARITAL_STATUS = "1";
                    } else if (result[i].value == "W") {
                        MARITAL_STATUS = "4";
                    } else if (result[i].value == "C") {
                        MARITAL_STATUS = "5";
                    } else if (result[i].value == "1") {
                        MARITAL_STATUS = "1";
                    } else if (result[i].value == "2") {
                        MARITAL_STATUS = "2";
                    } else if (result[i].value == "3") {
                        MARITAL_STATUS = "3";
                    } else if (result[i].value == "4") {
                        MARITAL_STATUS = "4";
                    } else if (result[i].value == "5") {
                        MARITAL_STATUS = "5";
                    } else {
                        MARITAL_STATUS = "1";
                    }
                }


                if (key == "SENDING_FACILITY") {
                    SENDING_FACILITY = result[i].value;
                }
                if (key == "ID") {
                    if (result[i + 1].value == "CCC_NUMBER") {
                        CCC_NUMBER = result[i].value;
                    }
                }

                if (key == "ID") {
                    if (result[i + 1].value == "PATIENT_CLINIC_NUMBER") {
                        PATIENT_CLINIC_NUMBER = result[i].value;
                    }
                }

                if (key == "OBSERVATION_DATETIME") {
                    if (result[i + 5].value == "CURRENT_REGIMEN") {
                        ART_DATE = result[i].value;
                    }
                }
            }

            var enroll_year = ENROLLMENT_DATE.substring(0, 4);
            var enroll_month = ENROLLMENT_DATE.substring(4, 6);
            var enroll_day = ENROLLMENT_DATE.substring(6, 8);
            var new_enroll_date = enroll_year + "-" + enroll_month + "-" + enroll_day;

            if (ART_DATE === "" || ART_DATE === undefined) {

                var new_art_date = '0000-00-00';

            } else {

                var art_year = ART_DATE.substring(0, 4);
                var art_month = ART_DATE.substring(4, 6);
                var art_day = ART_DATE.substring(6, 8);
                var new_art_date = art_year + "-" + art_month + "-" + art_day;

            }

            if (CCC_NUMBER.length != 10 || isNaN(CCC_NUMBER)) {
                console.log("Invalid CCC NUMBER");
                return;
            }

            let isClient = await Client.findOne({
                where: {
                    clinic_number: CCC_NUMBER
                }
            });

            if (_.isEmpty(isClient)) {
                let client = await Client.findOne({
                    where: {
                        phone_no: PHONE_NUMBER
                    }
                });

                if (!_.isEmpty(client))
                    return res
                        .status(400)
                        .json({
                            success: false,
                            message: `Phone number: ${PHONE_NUMBER} already exists in the system.`
                        });

                let partner = await Partner.findOne({
                    where: {
                        mfl_code: SENDING_FACILITY
                    }
                });

                if (_.isEmpty(partner))
                    return res
                        .status(404)
                        .json({
                            status: false,
                            message: `MFL CODE: ${SENDING_FACILITY} does not exist in system.`
                        });

                client = {
                    group_id: parseInt(GROUP_ID),
                    clinic_number: CCC_NUMBER,
                    f_name: FIRST_NAME,
                    m_name: MIDDLE_NAME,
                    l_name: LAST_NAME,
                    dob: new_date,
                    phone_no: PHONE_NUMBER,
                    partner_id: partner.partner_id,
                    mfl_code: parseInt(SENDING_FACILITY),
                    // status: ,
                    // client_status: Sequelize.ENUM("ART", "Pre-Art", "On Care", "No Condition"),
                    gender: parseInt(SEX),
                    marital: MARITAL_STATUS,
                    enrollment_date: new_enroll_date,
                    art_date: new_art_date,
                    client_type: PATIENT_TYPE,
                    gods_number: GODS_NUMBER,
                    patient_source: PATIENT_SOURCE,
                    file_no: PATIENT_CLINIC_NUMBER,
                    locator_county: COUNTY,
                    locator_sub_county: SUB_COUNTY,
                    locator_ward: WARD,
                    locator_village: VILLAGE,
                    sending_application: SENDING_APPLICATION
                }
                console.log(client);

                await Client.create(client)
                    .then(function (model) {
                        message = "OK";
                        response = "Client successfully added.";

                        return res.json({
                            message: message,
                            response: {
                                msg: response,
                                client: _.pick(client, [
                                    "id",
                                    "f_name",
                                    "m_name",
                                    "l_name",
                                    "dob",
                                    "phone_no",
                                    "email",
                                    "partner_id",
                                    "facility_id",
                                    "status",
                                    "clinic_id",
                                    "createdAt"
                                ])
                            }
                        });
                    })
                    .catch(function (err) {
                        code = 500;
                        response = err.message;
                        console.error(err);

                        return res.json({
                            response: {
                                msg: response,
                                errors: err.errors
                            }
                        });
                    });


            } else {
                let client = {
                    group_id: parseInt(GROUP_ID),
                    mfl_code: parseInt(SENDING_FACILITY),
                    art_date: new_art_date,
                    client_type: PATIENT_TYPE,
                    file_no: PATIENT_CLINIC_NUMBER,
                    sending_application: SENDING_APPLICATION
                }
                await Client.update(client, {returning: true, where: {clinic_number: CCC_NUMBER}})
                    .then(function (model) {
                        message = "OK";
                        response = "Client successfully updated.";

                        return res.json({
                            message: message,
                            response: {
                                msg: response,
                                client: _.pick(client, [
                                    "group_id",
                                    "art_date",
                                    "client_type",
                                    "file_no",
                                    "sending_application",
                                    "mfl_code",
                                    "updatedAt"
                                ])
                            }
                        });
                    })
                    .catch(function (err) {
                        code = 500;
                        response = err.message;
                        console.error(err);

                        return res.json({
                            response: {
                                msg: response,
                                errors: err.errors
                            }
                        });
                    });

            }

        } else if (message_type == "SIU^S12") {
            var GODS_NUMBER = jsonObj.PATIENT_IDENTIFICATION.EXTERNAL_PATIENT_ID.ID;
            var SENDING_FACILITY;

            var CCC_NUMBER;
            var APPOINTMENT_REASON;
            var APPOINTMENT_TYPE;
            var APPOINTMENT_DATE;
            var APPOINTMENT_PLACING_ENTITY;
            var PLACER_APPOINTMENT_NUMBER;

            var APPOINTMENT_LOCATION;
            //var ACTION_CODE;
            var APPOINTMENT_NOTE;
            var APPOINTMENT_HONORED;
            var CREATED_AT;

            var result = get_json(jsonObj);

            console.log(result);

            for (var i = 0; i < result.length; i++) {
                var key = result[i].key;
                var key_value = result[i].value;


                if (key == "SENDING_FACILITY") {
                    SENDING_FACILITY = result[i].value;
                } else if (key == "NUMBER") {
                    PLACER_APPOINTMENT_NUMBER = result[i].value;
                } else if (key == "GODS_NUMBER") {
                    //GODS_NUMBER = result[20].value;
                } else if (key == "APPOINTMENT_REASON") {
                    APPOINTMENT_REASON = result[i].value;
                } else if (key == "APPOINTMENT_TYPE") {
                    APPOINTMENT_TYPE = result[i].value;
                } else if (key == "APPOINTMENT_LOCATION") {
                    APPOINTMENT_LOCATION = result[i].value;
                } else if (key == "APPINTMENT_HONORED") {
                    APPOINTMENT_HONORED = result[i].value;
                } else if (key == "APPOINTMENT_NOTE") {
                    APPOINTMENT_NOTE = result[i].value;
                } else if (key == "ACTION_CODE") {
                    ACTION_CODE = result[i].value;
                } else if (key == "APPOINTMENT_PLACING_ENTITY") {
                    APPOINTMENT_PLACING_ENTITY = result[i].value;
                } else if (key == "VISIT_DATE") {
                    CREATED_AT = result[i].value;
                    var year = CREATED_AT.substring(0, 4);
                    var month = CREATED_AT.substring(4, 6);
                    var day = CREATED_AT.substring(6, 8);

                    var app_date = year + "-" + month + "-" + day;

                    var current_date = moment(new Date());
                    var today = current_date.format("YYYY-MM-DD");

                    var BirthDate = moment(app_date);
                    CREATED_AT = BirthDate.format("YYYY-MM-DD");
                } else if (key == "APPOINTMENT_DATE") {
                    APPOINTMENT_DATE = result[i].value;
                    APPOINTMENT_DATE = APPOINTMENT_DATE;

                    var year = APPOINTMENT_DATE.substring(0, 4);
                    var month = APPOINTMENT_DATE.substring(4, 6);
                    var day = APPOINTMENT_DATE.substring(6, 8);

                    var app_date = year + "-" + month + "-" + day;

                    var current_date = moment(new Date());
                    var today = current_date.format("YYYY-MM-DD");

                    var BirthDate = moment(app_date);
                    APPOINTMENT_DATE = BirthDate.format("YYYY-MM-DD");
                }

                if (key == "ID") {
                    if (result[i + 1].value == "CCC_NUMBER") {
                        CCC_NUMBER = result[i].value;
                    }
                }
            }

            if (CCC_NUMBER.length != 10 || isNaN(CCC_NUMBER)) {
                console.log("Invalid CCC NUMBER");
            }
            if (APPOINTMENT_LOCATION == "PHARMACY" || APPOINTMENT_REASON == "REGIMEN REFILL") {
                APPOINTMENT_TYPE = 1;
            } else {
                APPOINTMENT_TYPE = 2;
            }

            var APP_STATUS = "Booked";
            var ACTIVE_APP = "1";
            var SENDING_APPLICATION = jsonObj.MESSAGE_HEADER.SENDING_APPLICATION;

            let client = await Client.findOne({
                where: {
                    clinic_number: CCC_NUMBER
                }
            })
            if (_.isEmpty(client))
                return res
                    .status(400)
                    .json({
                        success: false,
                        message: `Client: ${CCC_NUMBER} does not exists in the system.`
                    });
            let isAppointment = await Appointment.findOne({
                where: {
                    entity_number: PLACER_APPOINTMENT_NUMBER
                }
            })

            if (_.isEmpty(isAppointment)) {

                let appointment = {
                    client_id: client.id,
                    appntmnt_date: APPOINTMENT_DATE,
                    app_type_1: APPOINTMENT_TYPE,
                    appointment_reason: APPOINTMENT_REASON,
                    app_status: APP_STATUS,
                    db_source: SENDING_APPLICATION,
                    active_app: ACTIVE_APP,
                    appointment_location: APPOINTMENT_LOCATION,
                    reason: APPOINTMENT_NOTE,
                    entity_number: PLACER_APPOINTMENT_NUMBER
                }

                await Appointment.create(appointment)
                    .then(async function (data) {
                        console.log(data)
                        await Appointment.update({active_app: '0'}, {
                            returning: true,
                            where: {
                                client_id: client.id,
                                entity_number: {
                                    [Op.not]: PLACER_APPOINTMENT_NUMBER
                                }
                            }
                        });
                        message = "OK";
                        response = "Appointment successfully created.";

                        return res.json({
                            message: message,
                            response: {
                                msg: response,
                                appointment: appointment
                            }
                        });
                    })
                    .catch(function (err) {
                        code = 500;
                        response = err.message;
                        return res.json({
                            response: {
                                msg: response,
                                error: err.errors
                            }
                        });
                    });
            } else {
                let appointment = {
                    appntmnt_date: APPOINTMENT_DATE,
                    app_type_1: APPOINTMENT_TYPE,
                    appointment_reason: APPOINTMENT_REASON,
                    app_status: APP_STATUS,
                    db_source: SENDING_APPLICATION,
                    active_app: ACTIVE_APP,
                    appointment_location: APPOINTMENT_LOCATION,
                    reason: APPOINTMENT_NOTE
                }

                await Appointment.update(appointment, {
                    returning: true,
                    where: {
                        client_id: client.id,
                        entity_number: PLACER_APPOINTMENT_NUMBER
                    }
                })
                    .then(function (data) {
                        message = "OK";
                        response = "Appointment successfully updated.";

                        return res.json({
                            message: message,
                            response: {
                                msg: response,
                                appointment: appointment
                            }
                        });
                    })
                    .catch(function (err) {
                        code = 500;
                        response = err.message;
                        return res.json({
                            response: {
                                msg: response,
                                error: err.errors
                            }
                        });
                    });
            }

        } else if (message_type == "ORU^R01") {

            var GODS_NUMBER = jsonObj.PATIENT_IDENTIFICATION.EXTERNAL_PATIENT_ID.ID;
            var CCC_NUMBER;
            var FIRST_NAME = jsonObj.PATIENT_IDENTIFICATION.PATIENT_NAME.FIRST_NAME;
            var MIDDLE_NAME = jsonObj.PATIENT_IDENTIFICATION.PATIENT_NAME.MIDDLE_NAME;
            var LAST_NAME = jsonObj.PATIENT_IDENTIFICATION.PATIENT_NAME.LAST_NAME;
            var SENDING_APPLICATION = jsonObj.MESSAGE_HEADER.SENDING_APPLICATION;
            var SENDING_FACILITY = jsonObj.MESSAGE_HEADER.SENDING_FACILITY;
            var OBSERVATION_VALUE;
            var OBSERVATION_DATETIME;

            var result = get_json(jsonObj);

            //console.log(result);

            for (var i = 0; i < result.length; i++) {
                var key = result[i].key;
                var value = result[i].value;

                if (key == "ID") {
                    if (result[i + 1].value == "CCC_NUMBER") {
                        CCC_NUMBER = result[i].value;
                    }
                } else if (key == "OBSERVATION_VALUE") {
                    OBSERVATION_VALUE = result[i].value;
                } else if (key == "OBSERVATION_DATETIME") {
                    OBSERVATION_DATETIME = result[i].value;
                }

            }


            if (CCC_NUMBER.length != 10 || isNaN(CCC_NUMBER)) {
                console.log("Invalid CCC NUMBER");
            }

            var observation_year = OBSERVATION_DATETIME.substring(0, 4);
            var observation_month = OBSERVATION_DATETIME.substring(4, 6);
            var observation_day = OBSERVATION_DATETIME.substring(6, 8);
            var observation_hour = OBSERVATION_DATETIME.substring(8, 10);
            var observation_minute = OBSERVATION_DATETIME.substring(10, 12);
            var observation_second = OBSERVATION_DATETIME.substring(12, 14);
            var new_observation_date = observation_year + "-" + observation_month + "-" + observation_day + " " + observation_hour + ":" + observation_minute + ":" + observation_second;

            //transfer out happends in client table

            console.log("date", new_observation_date, "value", OBSERVATION_VALUE)

            let client = await Client.findOne({
                where: {
                    clinic_number: CCC_NUMBER
                }
            })

            if (_.isEmpty(client))
                return res
                    .status(400)
                    .json({
                        success: false,
                        message: `Client: ${CCC_NUMBER} does not exists in the system.`
                    });
            let oru = {}
            if (OBSERVATION_VALUE == "TRANSFER_OUT") {
                oru.client_type = "Transfer Out"
                oru.mfl_code = SENDING_FACILITY
                oru.sending_application = SENDING_FACILITY
                oru.updated_at = new_observation_date

                await Client.update(oru, {returning: true, where: {id: client.id}})
                    .then(function (model) {
                        message = "OK";
                        response = "ORU successfully updated.";

                        return res.json({
                            message: message,
                            response: {
                                msg: response,
                                client: oru
                            }
                        });
                    })
                    .catch(function (err) {
                        code = 500;
                        response = err.message;
                        console.error(err);

                        return res.json({
                            response: {
                                msg: response,
                                errors: err.errors
                            }
                        });
                    });
            } else if (OBSERVATION_VALUE == "DIED") {
                oru.status = "Deceased"
                oru.mfl_code = SENDING_FACILITY
                oru.date_deceased = new_observation_date
                oru.sending_application = SENDING_FACILITY
                oru.updated_at = new_observation_date


                await Client.update(oru, {returning: true, where: {id: client.id}})
                    .then(function (model) {
                        message = "OK";
                        response = "ORU successfully updated.";

                        return res.json({
                            message: message,
                            response: {
                                msg: response,
                                client: oru
                            }
                        });
                    })
                    .catch(function (err) {
                        code = 500;
                        response = err.message;
                        console.error(err);

                        return res.json({
                            response: {
                                msg: response,
                                errors: err.errors
                            }
                        });
                    });
            } else if (OBSERVATION_VALUE == "LOST_TO_FOLLOWUP") {
                oru.app_status = "LTFU"
                oru.db_source = SENDING_APPLICATION
                oru.updated_at = new_observation_date

                let l_app = await Appointment.findAll({
                    limit: 1,
                    where: {
                        client_id: client.id
                    },
                    order: [['appntmnt_date', 'DESC']]
                })

                await Appointment.update(oru, {
                    returning: true, where: {
                        id: l_app[0].id
                    }
                })
                    .then(function (model) {
                        message = "OK";
                        response = "ORU successfully added.";

                        return res.json({
                            message: message,
                            response: {
                                msg: response,
                                client: oru
                            }
                        });
                    })
                    .catch(function (err) {
                        code = 500;
                        response = err.message;
                        console.error(err);

                        return res.status(400).json({
                            response: {
                                msg: response,
                                errors: err.errors
                            }
                        });
                    });

            }

        }
        console.log(true);
        // res.send(true);
    } else {

        console.log("IQCare Message, skip")
    }


});

app.post("/hl7-sync-client", (req, res) => {

    var client = req.body;

    console.log(client);

    db.getConnection(function (err, connection) {
        if (err) {
            console.log("im here", err);
        } else {

            let partner = connection.query('SELECT partner_id FROM tbl_partner_facility WHERE mfl_code', client.mfl_code, function (err, data) {
                if (err) {
                    console.log(err)
                }
            });

            let partner_id = partner[0];

            let clinic_number = client.clinic_number;

            let cl = {
                f_name: client.f_name,
                m_name: client.m_name,
                l_name: client.l_name,
                dob: client.dob,
                clinic_number: client.clinic_number,
                mfl_code: client.mfl_code,
                gender: client.gender,
                marital: client.marital,
                phone_no: client.phone_no,
                GODS_NUMBER: client.GODS_NUMBER,
                group_id: client.group_id,
                SENDING_APPLICATION: client.SENDING_APPLICATION,
                PATIENT_SOURCE: client.PATIENT_SOURCE,
                db_source: client.db_source,
                enrollment_date: client.enrollment_date,
                art_date: client.art_date,
                client_type: client.client_type,
                file_no: client.patient_clinic_number,
                locator_county: client.locator_county,
                locator_sub_county: client.locator_sub_county,
                locator_ward: client.locator_ward,
                locator_village: client.locator_village,
                partner_id: partner_id,

            }

            //if message code is ADT^A04 add new client else update client
            if (client.message_type === "ADT^A04") {
                connection.query('INSERT INTO tbl_client SET ?', cl, function (err, data) {
                    if (err) {
                        return console.error(err.message);
                    } else {
                        console.log(data);
                        res.send(data)

                    }
                });

            } else if (client.message_type === "ADT^A08") {

                connection.query('UPDATE tbl_client SET ? WHERE clinic_number = ?', [cl, clinic_number], function (err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(data);
                        res.send(data);

                    }
                });
            }

        }


    });

});

app.post("/hl7-sync-appointment", (req, res) => {

    var appointment = req.body;

    console.log(appointment);

    db.getConnection(function (err, connection) {
        if (err) {
            console.log("im here", err);
        } else {

            let client = connection.query('SELECT id FROM tbl_client WHERE clinic_number', [appointment.clinic_number], function (err, data) {
                if (err) {
                    console.log(err)
                }
            });

            console.log("client_id", client)

            let client_id = client[0];

            let placer_number = connection.query('SELECT ENTITY_NUMBER FROM tbl_appointment WHERE ENTITY_NUMBER ', [appointment.placer_appointment_number], function (err, data) {
                if (err) {
                    console.log(err)
                }
            })

            let appt = {
                appntmnt_date: appointment.appntmnt_date,
                app_type_1: appointment.app_type_1,
                APPOINTMENT_REASON: appointment.APPOINTMENT_REASON,
                app_status: appointment.app_status,
                active_app: appointment.active_app,
                APPOINTMENT_LOCATION: appointment.APPOINTMENT_LOCATION,
                db_source: appointment.db_source,
                reason: appointment.reason,
                ENTITY_NUMBER: appointment.placer_appointment_number,
                client_id: client_id,
                created_at: appointment.created_at,
                updated_at: appointment.created_at,

            }

            //update if placer number already exsists
            if (placer_number.length >= 1) {

                //update latest appointment where client_id and placer number match

                connection.query('UPDATE tbl_appointment SET ? WHERE client_id ? AND ENTITY_NUMBER ? ORDER BY appntmnt_date DESC LIMIT 1 ', appt, client_id, placer_number, function (err, data) {
                    if (err) {
                        return console.error(err.message);
                    } else {
                        res.send(data);

                    }
                });

            } else {

                console.log("in in empty placer")

                connection.query('INSERT INTO tbl_appointment SET ?', appt, function (err, data) {
                    if (err) {
                        return console.error(err.message);
                    } else {
                        let update_app_status = "UPDATE tbl_appointment set active_app = 0 where client_id = '" + client_id + "' AND ENTITY_NUMBER <> '" + PLACER_APPOINTMENT_NUMBER + "'";

                        connection.query(update_app_status, function (err_up, res_up, fields_up) {
                            if (error) {
                                return console.error(err_up.message);
                            } else {
                                console.log(res_up);
                                connection.release();
                            }
                        });
                        res.send(data);

                    }
                });

            }

        }

    });

});

app.post("/hl7-sync-observation", (req, res) => {

    var observation = req.body;

    console.log(appointment);

    db.getConnection(function (err, connection) {
        if (err) {
            console.log("im here", err);
        } else {

            let client = connection.query('SELECT id FROM tbl_client WHERE clinic_number', [appointment.clinic_number], function (err, data) {
                if (err) {
                    console.log(err)
                }
            });

            console.log("client_id", client)

            let client_id = client[0];

            let clinic_number = observation.clinic_number;

            let obs_cl_transfer = {
                client_type: observation.observation_value,
                mfl_code: observation.mfl_code,
                SENDING_APPLICATION: observation.db_source,
                updated_at: observation.observation_datetime,
                clinic_number: observation.clinic_number
            }

            let obs_cl_dead = {
                mfl_code: observation.mfl_code,
                active_app: observation.active_app,
                SENDING_APPLICATION: observation.db_source,
                status: observation.death_status,
                clinic_number: observation.clinic_number,
                updated_at: observation.observation_datetime,
                date_deceased: observation.observation_datetime

            }

            let obs_appmt = {
                active_app: observation.active_app,
                db_source: observation.SENDING_APPLICATION,
                app_status: observation.observation_value,
                client_id: client_id,
                updated_at: observation.observation_datetime,

            }

            if (obs_cl_transfer.client_type == "Transfer Out") {

                // Use the connection
                connection.query('UPDATE tbl_client SET ? WHERE clinic_number', obs_cl_transfer, clinic_number, function (error, results, fields) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log(update_sql, results);
                        // And done with the connection.
                        connection.release();
                    }

                });

            } else if (obs_cl_dead.status == "Deceased") {

                // Use the connection
                connection.query('UPDATE tbl_client SET ? WHERE clinic_number', obs_cl_dead, clinic_number, function (error, results, fields) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log(update_sql, results);
                        // And done with the connection.
                        connection.release();
                    }

                });

            } else if (obs_appmt.app_status == "LTFU") {

                // Use the connection
                connection.query('UPDATE tbl_appointment SET ? WHERE client_id ? ORDER BY appntmnt_date DESC LIMIT 1 ', obs_appmt, client_id, function (err, data) {
                    if (err) {
                        return console.error(err.message);
                    } else {
                        res.send(data);

                    }
                });

            }


        }

    });

});

app.listen(1440, () => {
    console.log("Ushauri IL listening on port 1440");
});

//convert json object to key value pairs
function get_json(jsonObj) {
    var output = [];

    for (var x in jsonObj) {
        if (typeof jsonObj[x] === "object") {
            output = output.concat(get_json(jsonObj[x]));
        } else {
            output.push({
                key: x,
                value: jsonObj[x],
            });
        }
    }

    return output;
}

