'use strict';

angular.module('bahmni.reports')
    .controller('ReportsController', ['$scope', 'appService', 'reportService', 'FileUploader', 'messagingService', 'spinner', '$rootScope', '$translate', 'auditLogService', function ($scope, appService, reportService, FileUploader, messagingService, spinner, $rootScope, $translate, auditLogService) {
        $scope.uploader = new FileUploader({
            url: Bahmni.Common.Constants.uploadReportTemplateUrl,
            removeAfterUpload: true,
            autoUpload: true
        });

        $scope.uploader.onSuccessItem = function (fileItem, response) {
            fileItem.report.reportTemplateLocation = response;
        };

        $rootScope.default = _.isUndefined($rootScope.default) ? {reportsRequiringDateRange: {}, reportsNotRequiringDateRange: {}} : $rootScope.default;
        $scope.reportsDefined = true;
        $scope.enableReportQueue = appService.getAppDescriptor().getConfigValue("enableReportQueue");

        $scope.setDefault = function (item, header) {
            var setToChange = header === 'reportsRequiringDateRange' ? $rootScope.reportsRequiringDateRange : $rootScope.reportsNotRequiringDateRange;
            setToChange.forEach(function (report) {
                report[item] = $rootScope.default[header][item];
            });
        };

        var isDateRangeRequiredFor = function (report) {
            return _.find($rootScope.reportsRequiringDateRange, {name: report.name});
        };

        var validateReport = function (report) {
            if (!report.responseType) {
                messagingService.showMessage("error", getTranslatedMessage("SELECT_REPORT_FORMAT") + report.name);
                return false;
            }
            if (report.responseType === 'application/vnd.ms-excel-custom' && !report.reportTemplateLocation) {
                if (!report.config.macroTemplatePath) {
                    messagingService.showMessage("error", getTranslatedMessage("WORKBOOK_TEMPLATE_ERROR") + report.name);
                    return false;
                }
                report.reportTemplateLocation = report.config.macroTemplatePath;
            }
            report.startDate = Bahmni.Common.Util.DateUtil.getDateWithoutTime(report.startDate);
            report.stopDate = Bahmni.Common.Util.DateUtil.getDateWithoutTime(report.stopDate);
            if (isDateRangeRequiredFor(report) && (!report.startDate || !report.stopDate)) {
                var msg = [];
                if (!report.startDate) {
                    msg.push(getTranslatedMessage("REPORTS_START_DATE_HEADER_KEY"));
                }
                if (!report.stopDate) {
                    msg.push(getTranslatedMessage("REPORTS_END_DATE_HEADER_KEY"));
                }
                messagingService.showMessage("error", getTranslatedMessage("PLEASE_SELECT_KEY") + msg.join(getTranslatedMessage("AND_KEY")));
                return false;
            }
            if (report.type == 'concatenated' && report.responseType == reportService.getMimeTypeForFormat('CSV')) {
                messagingService.showMessage('error', getTranslatedMessage("CSV_FORMAT_CONCATENATED_REPORTS_ERROR"));
                return false;
            }
            return true;
        };

        var getTranslatedMessage = function (key) {
            return $translate.instant(key);
        };

        $scope.downloadReport = function (report) {
            if (validateReport(report)) {
                reportService.generateReport(report);
                if (report.responseType === 'application/vnd.ms-excel-custom') {
                    report.reportTemplateLocation = undefined;
                    report.responseType = _.values($scope.formats)[0];
                }
                log(report.name);
            }
        };

        var log = function (reportName) {
            auditLogService.log(undefined, 'RUN_REPORT', {reportName: reportName}, "MODULE_LABEL_REPORTS_KEY");
        };

        $scope.scheduleReport = function (report) {
            if (validateReport(report)) {
                spinner.forPromise(reportService.scheduleReport(report)).then(function () {
                    messagingService.showMessage("info", report.name + getTranslatedMessage("ADDED_TO_MY_REPORTS"));
                }, function () {
                    messagingService.showMessage("error", getTranslatedMessage("ERROR_SCHEDULING_REPORT"));
                });
                if (report.responseType === 'application/vnd.ms-excel-custom') {
                    report.reportTemplateLocation = undefined;
                    report.responseType = _.values($scope.formats)[0];
                }
                log(report.name);
            }
        };

        var initializeFormats = function () {
            var supportedFormats = appService.getAppDescriptor().getConfigValue("supportedFormats") || _.keys(reportService.getAvailableFormats());
            supportedFormats = _.map(supportedFormats, function (format) {
                return format.toUpperCase();
            });
            $scope.formats = _.pick(reportService.getAvailableFormats(), supportedFormats);
        };

        var initialization = function () {
            var reportList = appService.getAppDescriptor().getConfigForPage("reports");
            $rootScope.reportsRequiringDateRange = _.isUndefined($rootScope.reportsRequiringDateRange) ? _.values(reportList).filter(function (report) {
                report.titleKey = report.titleKey ? getTranslatedMessage(report.titleKey) : report.name;
                return !(report.config && report.config.dateRangeRequired === false);
            }) : $rootScope.reportsRequiringDateRange;
            $rootScope.reportsNotRequiringDateRange = _.isUndefined($rootScope.reportsNotRequiringDateRange) ? _.values(reportList).filter(function (report) {
                if (report.titleKey !== undefined) {
                    report.titleKey = getTranslatedMessage(report.titleKey);
                } else {
                    report.titleKey = report.name;
                }
                return (report.config && report.config.dateRangeRequired === false);
            }) : $rootScope.reportsNotRequiringDateRange;
            $scope.reportsDefined = _.values(reportList).length > 0;

            initializeFormats();
        };

        initialization();
    }]);
