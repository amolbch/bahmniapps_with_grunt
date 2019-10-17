'use strict';

angular.module('bahmni.common.patient')
    .service('patientService', ['$http', 'sessionService', function ($http, sessionService) {
        this.getPatient = function (uuid) {
            var patient = $http.get(Bahmni.Common.Constants.openmrsUrl + "/ws/rest/v1/patient/" + uuid, {
                method: "GET",
                params: {v: "full"},
                withCredentials: true
            });
            return patient;
        };

        this.getRelationships = function (patientUuid) {
            return $http.get(Bahmni.Common.Constants.openmrsUrl + "/ws/rest/v1/relationship", {
                method: "GET",
                params: {person: patientUuid, v: "full"},
                withCredentials: true
            });
        };

        this.findPatients = function (params) {
            return $http.get(Bahmni.Common.Constants.sqlUrl, {
                method: "GET",
                params: params,
                withCredentials: true
            });
        };

        this.getPatientStatusState = function (patientUuid) {
            return $http.get(Bahmni.Common.Constants.openmrsUrl + "/ws/rest/emrapi/patientStatusState?patientUuid=" + patientUuid, {
                method: "GET"
            });
        };

        this.savePatientStatusState = function (patientStatus, patientUuid, creatorUuid, patientState) {
            var emrApiURL = Bahmni.Common.Constants.hostURL + '/openmrs/ws/rest/emrapi';
            var url = emrApiURL + "/setPatientStatusState";
            var data = {
                "patientUuid": patientUuid,
                "patient_state": patientState,
                "patient_status": patientStatus,
                "creatorUuid": creatorUuid
            };
            return $http.post(url, data, {
                withCredentials: true,
                headers: {"Accept": "application/json", "Content-Type": "application/json"}
            });
        };

        this.search = function (query, offset, identifier) {
            offset = offset || 0;
            var patientSearchResultsConfig = ['NICK_NAME', 'PRIMARY_CONTACT_NUMBER_1', 'PATIENT_STATUS'];
            return $http.get(Bahmni.Common.Constants.bahmniSearchUrl + "/patient", {
                method: "GET",
                params: {
                    q: query,
                    startIndex: offset,
                    identifier: identifier,
                    loginLocationUuid: sessionService.getLoginLocationUuid(),
                    patientSearchResultsConfig: patientSearchResultsConfig
                },
                withCredentials: true
            });
        };

        this.statusBasedSearch = function (query, offset, identifier) {
            offset = offset || 0;
            return $http.get(Bahmni.Common.Constants.bahmniStatusBasedSearchUrl + "/patient", {
                method: "GET",
                params: {
                    q: query,
                    startIndex: offset,
                    identifier: identifier,
                    loginLocationUuid: sessionService.getLoginLocationUuid()
                },
                withCredentials: true
            });
        };

        this.getPatientContext = function (patientUuid, programUuid, personAttributes, programAttributes, patientIdentifiers) {
            return $http.get('/openmrs/ws/rest/v1/bahmnicore/patientcontext', {
                params: {
                    patientUuid: patientUuid,
                    programUuid: programUuid,
                    personAttributes: personAttributes,
                    programAttributes: programAttributes,
                    patientIdentifiers: patientIdentifiers
                },
                withCredentials: true
            });
        };
    }]);
