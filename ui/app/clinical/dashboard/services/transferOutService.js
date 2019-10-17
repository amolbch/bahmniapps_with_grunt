'use strict';

angular.module('bahmni.clinical')
    .service('transferOutService', ['$rootScope', '$translate', 'patientService', 'observationsService', 'programService', 'treatmentService', 'localeService', 'patientVisitHistoryService', 'conceptSetService', 'labOrderResultService',
        function ($rootScope, $translate, patientService, observationsService, programService, treatmentService, localeService, patientVisitHistoryService, conceptSetService, labOrderResultService) {
            var reportModel = {

                hospitalLogo: '',
                hospitalName: '',
                Transfer: '',
                dest: '',
                patientInfo: {
                    mainContact: '',
                    username: '',
                    Tb_start: '',
                    INH_start: '',
                    INH_end: '',
                    firstName: '',
                    lastName: '',
                    age: '',
                    sex: '',
                    weight: '',
                    height: '',
                    patientId: '',
                    address: '',
                    birth_date: '',
                    address1: '',
                    address2: '',
                    address3: '',
                    address4: '',
                    District: '',
                    province: '',
                    close: '',
                    BMI: '',
                    CTZ_start: '',
                    CTZ_end: '',
                    Tb_end: '',
                    Tb_back: '',
                    pregStatus: '',
                    breastFeedingStatus: '',
                    whoStaging: '',
                    stageConditionName: '',
                    modelTypes: '',
                    modelDate: '',
                    hivDate: '',
                    patientStatus: '',
                    regDate: '',
                    labName: '',
                    labOrderResult: '',
                    mdsYes: '',
                    mdsNo: '',
                    secLast: '',
                    thirdLast: '',
                    secLastDate: '',
                    thirdLastDate: '',
                    condName: '',
                    diagnosisName: '',
                    pastName: '',
                    notARV: '',
                    isARV: '',
                    currRegARV: '',
                    diagnosisPastName: '',
                    resultAlt: '',
                    resultAst: '',
                    resultHb: '',
                    resultVl: '',
                    resultcd: ''
                }
            };

            var patientUuid = '';
            var isTARVReport;

            var arvConceptUuids = [];

            this.getReportModel = function (_patientUuid, _isTARVReport) {
                patientUuid = _patientUuid;
                isTARVReport = _isTARVReport;
                return new Promise(function (resolve, reject) {
                    var p1 = populatePatientDemographics();
                    var p2 = populatePatientWeightAndHeight();
                    var p4 = populateLocationAndDrugOrders(0);
                    var p5 = populateHospitalNameAndLogo();
                    var p6 = populatePatientHeight();
                    var p7 = populateBMI();
                    var p8 = populateTransferDate();
                    var p9 = populatehospitalName();
                    var p14 = populateTbDetails();
                    var p15 = populateTbEndDate();
                    var p16 = populateTbBackground();
                    var p17 = populatePreg();
                    var p18 = populateBrestFeeding();
                    var p19 = populateWhoStage();
                    var p20 = populateModels();
                    var p22 = populateProf();
                    var p24 = populateLabResult();
                    var p25 = populateARV();
                    var p23 = populateARTDetails();
                    var p26 = populatePatientLabResults();

                    Promise.all([p1, p2, p4, p6, p5, p7, p8, p9, p14, p15, p16, p17, p18, p19, p20, p22, p23, p24, p25, p26]).then(function () {
                        resolve(reportModel);
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populatehospitalName = function () {
                reportModel.hospitalName = $rootScope.healthFacility.name;
            };

            var populateTransferDate = function () {
                if ($rootScope.patient.TRANSFER_OUT_NAME === undefined && $rootScope.patient.Transfer_Date === undefined) {
                    reportModel.dest = null;
                    reportModel.Transfer = null;
                }
                else {
                    if ($rootScope.patient.TRANSFER_OUT_NAME) {
                        reportModel.dest = $rootScope.patient.TRANSFER_OUT_NAME.value;
                    }

                    if ($rootScope.patient.Transfer_Date) {
                        reportModel.Transfer = $rootScope.patient.Transfer_Date.value;
                    }
                }
            };

            var populatePatientDemographics = function () {
                return new Promise(function (resolve, reject) {
                    patientService.getPatient(patientUuid).then(function (response) {
                        var patientMapper = new Bahmni.PatientMapper($rootScope.patientConfig, $rootScope, $translate);
                        var contact = response.data.person.attributes[0].value;
                        reportModel.patientInfo.mainContact = $rootScope.patient.PRIMARY_CONTACT_NUMBER_1.value;
                        var patient = patientMapper.map(response.data);
                        reportModel.patientInfo.firstName = patient.givenName;
                        reportModel.patientInfo.lastName = patient.familyName;
                        reportModel.patientInfo.sex = patient.gender;
                        reportModel.patientInfo.age = patient.age;
                        reportModel.patientInfo.patientId = patient.identifier;
                        reportModel.patientInfo.birth_date = patient.birthdate;
                        reportModel.patientInfo.stageConditionName = $rootScope.stageConditionName;
                        reportModel.patientInfo.username = $rootScope.currentUser.username;

                        if ($rootScope.patient.DateofHIVDiagnosis === undefined) {
                            reportModel.patientInfo.hivDate = null;
                        }
                        else {
                            reportModel.patientInfo.hivDate = $rootScope.patient.DateofHIVDiagnosis.value;
                        }
                        reportModel.patientInfo.condName = $rootScope.conditionName;

                        var arrDiagc = [];
                        if ($rootScope.diagName == null && $rootScope.diagPastName == null) {
                            $rootScope.diagName = null;
                        }
                        else if ($rootScope.diagName == null && $rootScope.diagPastName !== null) {
                            for (var j = 0; j < $rootScope.diagPastName.length; j++) {
                                arrDiagc.push($rootScope.diagPastName[j]);
                                var arr = arrDiagc.join('');
                            } reportModel.patientInfo.diagnosisPastName = arr;
                        }
                        else if ($rootScope.diagName !== null && $rootScope.diagPastName !== null) {
                            for (var j = 0; j < $rootScope.diagName.length; j++) {
                                arrDiagc.push($rootScope.diagName[j]);
                            }
                            reportModel.patientInfo.diagnosisName = arrDiagc;
                            reportModel.patientInfo.diagnosisPastName = null;
                        }
                        reportModel.patientInfo.regDate = $rootScope.patient.US_REG_DATE.value;

                        var statusArray = [{ name: "Pre TARV" }, { name: "TARV" }];
                        var arrStatus = [];
                        for (var k = 0; k < statusArray.length; k++) {
                            if ($rootScope.patient.PATIENT_STATUS.value.display == statusArray[k].name) {
                                arrStatus.push(statusArray[k].name);
                            }
                        }
                        reportModel.patientInfo.patientStatus = arrStatus;
                        reportModel.patientInfo.patientStatus = arrStatus;
                        var addressMap = patient.address;
                        reportModel.address1 = addressMap.address1;
                        reportModel.address2 = addressMap.address2;
                        reportModel.address3 = addressMap.address3;
                        reportModel.address4 = addressMap.address4;
                        reportModel.District = addressMap.cityVillage;
                        reportModel.close = addressMap.closeof;
                        reportModel.province = addressMap.stateProvince;
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populatePatientWeightAndHeight = function () {
                return new Promise(function (resolve, reject) {
                    var patientWeightConceptName = 'Weight';
                    observationsService.fetch(patientUuid, [patientWeightConceptName]).then(function (response) {
                        if (response.data && response.data.length > 0) {
                            reportModel.patientInfo.weight = response.data[0].value;
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populatePatientLabResults = function () {
                reportModel.labOrderResult = {};
                var labResultsToShow = ['LO_CD4', 'LO_ViralLoad', 'LO_ALT', 'LO_AST', 'LO_HB', 'LO_Other:'];
                return new Promise(function (resolve, reject) {
                    labOrderResultService.getAllForPatient({patientUuid: patientUuid}).then(function (response) {
                        if (response.labAccessions) {
                            if (response.labAccessions.length > 0) {
                                _.map(response.labAccessions[0], function (currentObj) {
                                    if (_.includes(labResultsToShow, currentObj.testName)) {
                                        reportModel.labOrderResult[currentObj.testName] = {testDate: currentObj.resultDateTime, testResult: currentObj.result};
                                    }
                                });
                            }
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateProf = function () {
                return new Promise(function (resolve, reject) {
                    var patienINH = 'INH_Details';
                    var patientCTZ = 'CTZ_Details';
                    observationsService.fetch(patientUuid, [patienINH, patientCTZ]).then(function (response) {
                        var startDate = "Start Date_Prophylaxis";
                        var endDate = "End Date";

                        if ((response.data.length === 0)) {
                            observationsService.fetch(patientUuid, [startDate, endDate]).then(function (response) {
                                reportModel.patientInfo.INH_end = null;
                                reportModel.patientInfo.INH_start = null;
                            });
                        }
                        else if (response.data[0].concept.name == "CTZ_Details") {
                            observationsService.fetch(patientUuid, [startDate, endDate]).then(function (response) {
                                reportModel.patientInfo.CTZ_end = response.data[1].value;
                                reportModel.patientInfo.CTZ_start = response.data[0].value;
                            });
                        }
                        else if ((response.data[0].concept.name == "INH_Details")) {
                            observationsService.fetch(patientUuid, [startDate, endDate]).then(function (response) {
                                reportModel.patientInfo.INH_end = response.data[1].value;
                                reportModel.patientInfo.INH_start = response.data[0].value;
                            });
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateARV = function () {
                return new Promise(function (resolve, reject) {
                    var arvDrug = 'ARV DRUG';
                    observationsService.fetch(patientUuid, [arvDrug]).then(function (response) {
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };
            var populatePatientHeight = function () {
                return new Promise(function (resolve, reject) {
                    var patientHeightConceptName = 'Height';
                    observationsService.fetch(patientUuid, [patientHeightConceptName]).then(function (response) {
                        if (response.data && response.data.length > 0) {
                            reportModel.patientInfo.height = response.data[0].value;
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateTbDetails = function () {
                return new Promise(function (resolve, reject) {
                    var TbStart = "SP_Treatment Start Date";
                    observationsService.fetch(patientUuid, [TbStart]).then(function (response) {
                        if (response.data && response.data.length > 0) {
                            reportModel.patientInfo.Tb_start = response.data[0].value;
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateTbEndDate = function () {
                return new Promise(function (resolve, reject) {
                    var TbEnd = "SP_Treatment End Date";
                    observationsService.fetch(patientUuid, [TbEnd]).then(function (response) {
                        if (response.data && response.data.length > 0) {
                            reportModel.patientInfo.Tb_end = response.data[0].value;
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };
            var populateTbBackground = function () {
                return new Promise(function (resolve, reject) {
                    var TbEnd = "Has TB Symptoms";
                    observationsService.fetch(patientUuid, [TbEnd]).then(function (response) {
                        if (response.data && response.data.length > 0) {
                            var a = response.data[0].value;
                            if (a === true) {
                                reportModel.patientInfo.Tb_back = "Sim";
                            }
                            else {
                                reportModel.patientInfo.Tb_back = "Não";
                            }
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populatePreg = function () {
                return new Promise(function (resolve, reject) {
                    var preg = "Pregnancy_Yes_No";
                    observationsService.fetch(patientUuid, [preg]).then(function (response) {
                        if (response.data && response.data.length > 0) {
                            reportModel.patientInfo.pregStatus = response.data[0].valueAsString;
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateBrestFeeding = function () {
                return new Promise(function (resolve, reject) {
                    var brestFeeding = "Breastfeeding_ANA";
                    observationsService.fetch(patientUuid, [brestFeeding]).then(function (response) {
                        if (response.data && response.data.length > 0) {
                            var status = response.data[0].valueAsString;
                            if (status == "No") {
                                reportModel.patientInfo.breastFeedingStatus = "ANSWER_NO";
                            }
                            else {
                                reportModel.patientInfo.breastFeedingStatus = "ANSWER_YES";
                            }
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateWhoStage = function () {
                return new Promise(function (resolve, reject) {
                    var WhoStage = "HTC, WHO Staging";
                    observationsService.fetch(patientUuid, [WhoStage]).then(function (response) {
                        if (response.data && response.data.length > 0) {
                            reportModel.patientInfo.whoStaging = response.data[0].valueAsString;
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateLabResult = function () {
                var Resultarray = [];
                if ($rootScope.lab === undefined) {
                    Resultarray = null;
                }
                else {
                    var labResult = $rootScope.lab.results.forEach(function (labres) {
                        Resultarray.push(labres);
                    });
                    var temp = [];
                    var temp1 = [];
                    for (var i = 0; i < Resultarray.length; i++) {
                        temp.push(Resultarray[i].orderName);
                        temp1.push(Resultarray[i].result);
                        reportModel.patientInfo.labName = temp[i];

                        if (temp[i] == "LO_HB)")
                         {
                            if (temp[i] === null)
                             {
                                reportModel.patientInfo.resultHb = null;
                            }
                            else
                            {
                                reportModel.patientInfo.resultHb = temp1[i];
                            }
                        }

                        if (temp[i] == "LO_ViralLoad")
                         {
                            if (temp[i] === null)
                            {
                                reportModel.patientInfo.resultVl = null;
                            }
                            else
                            {
                                reportModel.patientInfo.resultVl = temp1[i];
                            }
                        }

                        if (temp[i] == "LO_CD4")
                         {
                            if (temp[i] === null)
                            {
                                reportModel.patientInfo.resultcd = null;
                            }
                            else
                            {
                                reportModel.patientInfo.resultcd = temp1[i];
                            }
                        }

                        if (temp[i] == "LO_ALT")
                         {
                            if (temp[i] === null)
                            {
                                reportModel.patientInfo.resultAlt = null;
                            }
                            else
                            {
                                reportModel.patientInfo.resultAlt = temp1[i];
                            }
                        }

                        if (temp[i] == "LO_AST")
                        {
                            if (temp[i] === null)
                             {
                                reportModel.patientInfo.resultAst = null;
                            }
                            else
                            {
                                reportModel.patientInfo.resultAst = temp1[i];
                            }
                        }
                    }
                }
            };

            var populateARTDetails = function ()
             {
                return new Promise(function (resolve, reject)
                {
                    treatmentService.getActiveDrugOrders(patientUuid, null, null).then(function (response)
                     {
                        var drugarr = [];
                        for (var i = response.length - 1; i >= 0; i--) {
                            var obj = {};
                            obj[0] = response[i].effectiveStartDate;
                            obj[1] = response[i].concept.name;
                            drugarr.push(obj);
                        }

                        for (var i = drugarr.length; i > 0; i--) {
                            for (var j = 1; j < i; j++) {
                                if (j % 2 !== 0) {
                                    reportModel.regimeName = drugarr[i - 1][j];
                                    reportModel.regimeChangeName = drugarr[i - 2][j];
                                }
                                reportModel.regimeStartDate = drugarr[i - 1][j - 1];
                                reportModel.regimeChangeDate = drugarr[i - 2][j - 1];
                            }
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateModels = function () {
                return new Promise(function (resolve, reject) {
                    var modelsName = "Apss_Differentiated_Models";
                    observationsService.fetch(patientUuid, [modelsName]).then(function (response) {
                        var modelarray = [];
                        var abc = response.data.forEach(function (res) {
                            var group = res.groupMembers.forEach(function (name) {
                                modelarray.push(name);
                            });
                        });

                        var temp = [];
                        for (var i = 0; i < modelarray.length; i++) {
                            temp.push(modelarray[i].concept.shortName);
                        }

                        if (modelarray.length !== 0) {
                            reportModel.patientInfo.mdsYes = "ANSWER_YES";
                        }
                        if (modelarray.length === 0) {
                            reportModel.patientInfo.mdsYes = "ANSWER_NO";
                        }
                        reportModel.patientInfo.modelTypes = temp;

                        var arrDate = [];
                        var arr = response.data.forEach(function (date) {
                            arrDate.push(date);
                        });

                        if (arrDate === undefined || arrDate.length === 0) {
                            reportModel.patientInfo.modelDate = null;
                        }
                        else if (arrDate.length >= 1) {
                            var ddate = arrDate.length - 1;
                            reportModel.patientInfo.modelDate = arrDate[ddate].observationDateTime;
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateBMI = function () {
                var patientBMIConceptName = 'BMI';
                observationsService.fetch(patientUuid, [patientBMIConceptName]).then(function (response) {
                    if (response.data && response.data.length > 0) {
                        reportModel.patientInfo.BMI = response.data[0].value;
                    }
                });
            };

            var populateDrugOrders = function (visitUuid) {
                return new Promise(function (resolve, reject) {
                    treatmentService.getPrescribedDrugOrders(patientUuid, true).then(function (response) {
                        var resarray = [];
                        var arrres = response.forEach(function (Drug) {
                            resarray.push(Drug);
                        });
                        var arrARV = [];
                        var arrNotARV = [];
                        var dateARV = [];
                        var dateNotARV = [];
                        for (var i = 0; i < resarray.length; i++) {
                            if (resarray[i].drug.form !== 'ARV') {
                                resarray[i].concept.name;
                                arrNotARV.push(resarray[i].concept.name);
                                dateNotARV.push(resarray[i].effectiveStartDate);
                                reportModel.patientInfo.notARV = arrNotARV;
                            }
                            else {
                                resarray[i].concept.name;
                                arrARV.push(resarray[i].concept.name);
                                dateARV.push(resarray[i].effectiveStartDate);
                                reportModel.patientInfo.isARV = resarray[i].concept.name;

                                for (var j = 0; j < arrARV.length; j++) {
                                    if (arrARV.length === 0) {
                                        reportModel.patientInfo.currRegARV = null;
                                        reportModel.patientInfo.secLast = null;
                                        reportModel.patientInfo.thirdLast = null;
                                        reportModel.patientInfo.secLastDate = null;
                                        reportModel.patientInfo.thirdLastDate = null;
                                    }

                                    else if (arrARV.length === 1) {
                                        reportModel.patientInfo.currRegARV = arrARV[j];
                                    }

                                    else if (arrARV.length === 2) {
                                        reportModel.patientInfo.currRegARV = arrARV[0];
                                        reportModel.patientInfo.secLast = arrARV[1];
                                        reportModel.patientInfo.thirdLast = null;
                                        reportModel.patientInfo.secLastDate = dateARV[1];
                                        reportModel.patientInfo.thirdLastDate = null;
                                    }
                                    else if (arrARV.length >= 3) {
                                        reportModel.patientInfo.currRegARV = arrARV[0];
                                        reportModel.patientInfo.secLast = arrARV[1];
                                        reportModel.patientInfo.thirdLast = arrARV[2];
                                        reportModel.patientInfo.secLastDate = dateARV[1];
                                        reportModel.patientInfo.thirdLastDate = dateARV[2];
                                    }
                                }
                            }
                        }
                    });
                    resolve();
                }).catch(function (error) {
                    reject(error);
                });
            };

            var populateLocationAndDrugOrders = function (lastVisit) {
                return new Promise(function (resolve, reject) {
                    patientVisitHistoryService.getVisitHistory(patientUuid, null).then(function (response) {
                        if (response.visits && response.visits.length > 0) {
                            reportModel.location = response.visits[lastVisit].location.display;
                            populateDrugOrders(response.visits[lastVisit].uuid);
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateHospitalNameAndLogo = function () {
                return new Promise(function (resolve, reject) {
                    localeService.getLoginText().then(function (response) {
                        reportModel.hospitalLogo = response.data.homePage.logo;
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };
        }]);
