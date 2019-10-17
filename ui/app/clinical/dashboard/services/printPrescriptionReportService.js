'use strict';

angular.module('bahmni.clinical')
    .service('printPrescriptionReportService', ['$rootScope', '$translate', 'patientService', 'observationsService', 'programService', 'treatmentService', 'localeService', 'patientVisitHistoryService', 'conceptSetService',
        function ($rootScope, $translate, patientService, observationsService, programService, treatmentService, localeService, patientVisitHistoryService, conceptSetService) {
            var count = 0;
            var reportModel = {
                username: $rootScope.currentUser.username,
                hospitalLogo: '',
                hospitalName: '',
                patientInfo: {
                    firstName: '',
                    lastName: '',
                    age: '',
                    sex: '',
                    weight: '',
                    patientId: '',
                    address: ''
                },
                tbComorbidity: '',
                tarvNumber: '',
                prescriber: '',
                prescriptionDate: '',
                location: '',
                orders: [],
                differentiatedCareModel: []
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
                    var p6 = populateDifferentiatedCareModel();
                    Promise.all([p1, p2, p4, p5, p6]).then(function () {
                        resolve(reportModel);
                    }).catch(function (error) {
                        reject(error);
                    });
                }).catch(function (error) {
                    reject(error);
                });
            };

            var drugConceptIsARV = function (drugConceptUuid) {
                return arvConceptUuids.includes(drugConceptUuid);
            };

            var populatePatientDemographics = function () {
                var add1 = "";
                var add2 = "";
                var add3 = "";
                var cityVillage = "";
                return new Promise(function (resolve, reject) {
                    patientService.getPatient(patientUuid).then(function (response) {
                        var patientMapper = new Bahmni.PatientMapper($rootScope.patientConfig, $rootScope, $translate);
                        var patient = patientMapper.map(response.data);
                        reportModel.patientInfo.firstName = patient.givenName;
                        reportModel.patientInfo.lastName = patient.familyName;
                        reportModel.patientInfo.sex = patient.gender;
                        reportModel.patientInfo.age = patient.age;
                        reportModel.patientInfo.patientId = patient.identifier;
                        if (patient.address.address1 != null) {
                            add1 = patient.address.address1 + ", ";
                        }
                        if (patient.address.address2 != null) {
                            add2 = patient.address.address2 + ", ";
                        }
                        if (patient.address.address3 != null) {
                            add3 = patient.address.address3 + ", ";
                        }
                        if (patient.address.cityVillage != null) {
                            cityVillage = patient.address.cityVillage + ", ";
                        }
                        reportModel.patientInfo.address = add1 + add2 + add3 + cityVillage + patient.address.stateProvince;
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };
            var populatePatientWeightAndHeight = function () {
                return new Promise(function (resolve, reject) {
                    var patientWeightConceptName = 'Weight';
                    var patientHeightConceptName = 'Height';
                    observationsService.fetch(patientUuid, [patientWeightConceptName, patientHeightConceptName]).then(function (response) {
                        if (response.data && response.data.length > 0) {
                            reportModel.patientInfo.weight = response.data[0].value;
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateDrugOrders = function (visitUuid) {
                return new Promise(function (resolve, reject) {
                    treatmentService.getPrescribedDrugOrders(patientUuid, true).then(function (response) {
                        var currentVisitOrders = response.filter(function (order) {
                            return order.visit.uuid === visitUuid && !drugConceptIsARV(order.concept.uuid);
                        });
                        if (currentVisitOrders.length <= 0) {
                            count = count + 1;
                            populateLocationAndDrugOrders(count);
                        }
                        reportModel.orders = [];
                        currentVisitOrders.forEach(function (order) {
                            var drug = order.drugNonCoded;
                            if (order.drug) {
                                drug = order.drug.name;
                            }
                            var instructions = '';
                            if (order.dosingInstructions.administrationInstructions) {
                                instructions = JSON.parse(order.dosingInstructions.administrationInstructions).instructions;
                                if (JSON.parse(order.dosingInstructions.administrationInstructions).additionalInstructions) {
                                    instructions += '. ' + JSON.parse(order.dosingInstructions.administrationInstructions).additionalInstructions;
                                }
                            }
                            var newOrder = {
                                drugName: drug,
                                dosage: order.dosingInstructions.dose,
                                drugUnit: order.dosingInstructions.doseUnits,
                                frequency: order.dosingInstructions.frequency,
                                duration: order.duration,
                                route: order.dosingInstructions.route,
                                durationUnit: order.durationUnits,
                                quantity: order.dosingInstructions.quantity,
                                provider: order.provider.name,
                                strength: order.drug.strength,
                                startDate: moment(order.scheduledDate).format('DD/MM/YYYY'),
                                instructions: instructions
                            };
                            reportModel.orders.push(newOrder);
                            reportModel.prescriber = order.provider.name;
                            reportModel.prescriptionDate = moment(order.dateActivated).format('DD/MM/YYYY');
                        });
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateLocationAndDrugOrders = function (lastVisit) {
                return new Promise(function (resolve, reject) {
                    patientVisitHistoryService.getVisitHistory(patientUuid, null).then(function (response) {
                        if (response.visits && response.visits.length > 0 && response.visits[lastVisit]) {
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
                        reportModel.hospitalName = response.data.loginPage.hospitalName;
                        reportModel.hospitalLogo = response.data.homePage.logo;
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };

            var populateDifferentiatedCareModel = function () {
                return new Promise(function (resolve, reject) {
                    observationsService.fetch(patientUuid, 'Reference_MDC_Section', undefined, 0, undefined, undefined, undefined, undefined).then(function (response) {
                        if (reportModel.differentiatedCareModel.length) {
                            reportModel.differentiatedCareModel = [];
                        }
                        if (response.data && response.data.length > 0 && response.data[0].groupMembers) {
                            response.data[0].groupMembers.forEach(member => {
                                if (member.concept.name != "Reference_Eligible" && member.value.name != "Reference_End") {
                                    reportModel.differentiatedCareModel.push(member.concept.shortName);
                                }
                            });
                        }
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            };
        }]);
