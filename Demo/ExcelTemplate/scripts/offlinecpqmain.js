var app = angular.module('offline', []);
app.controller('offlinecpqcontrol', function ($scope, $http, $timeout) {
    //隐藏自带的关闭符号
    if (parent.document.getElementById("InlineDialogCloseLink")) {
        $(parent.document.getElementById("InlineDialogCloseLink")).hide();//隐藏自带的关闭符号
    }
    if (parent.$(".ms-crm-InlineDialogCloseContainer")) {
        $(parent.$(".ms-crm-InlineDialogCloseContainer")).hide()
    }
    //接受从CRM页面传入的实体记录的相关参数
    $scope.args = {};
    if (window.getDialogArguments() != null) {
        _ajaxLoading("加载数据,请稍等...");
        $scope.args = window.getDialogArguments();
    }
    $scope.initTemplateList = {};
    var logicalname = $scope.args.logicalname;
    var id = $scope.args.entityid;
    if (logicalname == null || typeof (logicalname) == "undefined") {
        alert("未找到实体名称，无法查找模板数据，请联系管理员");
        _ajaxLoadEnd();
        return;
    }
    var paras = {
        logicalname: logicalname,
        entityid: id
    }
    var actionname = "new_OffLineQueryTemplateData";
    var ourl = Xrm.Page.context.getClientUrl() + "/api/data/v8.2/" + actionname;
    _ajaxLoading("加载导出模板数据,请稍等...");
    $http({
        url: ourl,
        data: JSON.stringify(paras),
        method: "POST",
        async: false
    }).then(function successCallback(response) {
        $scope.initTemplateList = JSON.parse(response.data.OutPutResult).data;
        //$scope.initTemplateList = JSON.parse("{\"code\":\"200\",\"data\":[{ \"templateName\":\"产品配置模板（含税版）\",\"templateId\":\"E601C619-9865-EA11-B397-00155DB44501\"},{ \"templateName\":\"产品配置模板（价税分离版）\",\"templateId\":\"E401C619-9865-EA11-B397-00155DB44501\"}],\"msg\":\"成功\"}").data;

    }, function errorCallback(response) {
        // 请求失败执行代码
        alert(response);
    });
    var entityId = window.getDialogArguments().entityid.replace("{", "").replace("}", "");
    paras = {
        new_pcquoteid: entityId,
    }
    //查询配置报价产品是否含有下市或受控产品
    _ajaxLoading("正在进行导出产品验证,请稍等...");
    actionname = "new_OffLineQueryProducts";
    ourl = Xrm.Page.context.getClientUrl() + "/api/data/v8.2/" + actionname;
    $http({
        url: ourl,
        data: JSON.stringify(paras),
        method: "POST",
        async: false
    }).then(function successCallback(response) {
        var productData = JSON.parse(response.data.OutPutResult).data;
        var findResult = Enumerable.from(productData).where(function (x, index) {
            return (x.new_ifdelisting == false);
        }).toArray();
        if (findResult.length > 0) {
            $("#p_state").css('display', 'block');
        }
        else {
            $("#p_state").css('display', 'none');
        }

        var findifcontrol = Enumerable.from(productData).where(function (x, index) {
            return (x.new_ifcontrolle == true);
        }).toArray();
        if (findifcontrol.length > 0) {
            $("#p_control").css('display', 'block');
        }
        else {
            $("#p_control").css('display', 'none');
        }

    }, function errorCallback(response) {
        // 请求失败执行代码
        alert(response);
    });

    $scope.args.entityid
    _ajaxLoadEnd();

    $scope.cpqclose = function () {
        Mscrm.Utilities.setReturnValue("close");
        closeWindow();
    }
    $scope.selectTemplateModel = null;
    $scope.DownloadTemplate = function () {
        if ($scope.selectTemplateModel == null) {
            alert("请选择导出模板");
            return;
        }

        _ajaxLoading("正在导出,请稍等...");
        var orgUniqueName = Xrm.Page.context.getOrgUniqueName();
        if (orgUniqueName == "360CRMDEV") {
            orgUniqueName = "_" + orgUniqueName;
        }
        $.ajax({
            type: "POST",
            dataType: "json",
            async: true,
            url: "/ISV/OfflinCPQ.WebApplication/OfflineCPQFileDownload.ashx",
            data: {
                templateId: $scope.selectTemplateModel,
                enttyDataId: $scope.args.entityid,
                OrganizationName: orgUniqueName,
                r: Math.random()
            },
            success: function (data) {
                if (data.code != "200") {
                    alert("下载失败:" + data.msg);
                }
                else {
                    download(base64ToArrayBuffer(data.data.filebody), data.data.filename, "application/pdf");
                }
                _ajaxLoadEnd();
            },
            error: function (ex) {
                var mgs = "'" + ex.responseText + "'";
                alert(mgs);
                _ajaxLoadEnd();
            }
        });
        //var actionname = "new_OffLine_CPQDownload";
        //var paras = {
        //    templateId: $scope.selectTemplateModel,
        //}
        //var ourl = Xrm.Page.context.getClientUrl() + "/api/data/v8.2/" + actionname;
        //var resp = "";
        //$.ajax({
        //    type: "POST",
        //    async: true,
        //    contentType: "application/json; charset=utf-8",
        //    datatype: "json",
        //    data: JSON.stringify(paras),
        //    url: ourl,
        //    beforeSend: function (XMLHttpRequest) {
        //        //Specifying this header ensures that the results will be returned as JSON.  
        //        XMLHttpRequest.setRequestHeader("Accept", "application/json");
        //    },
        //    success: function (data, textStatus, XmlHttpRequest) {
        //        resp = data.result;
        //        var resultJson = JSON.parse(resp);
        //        if (resultJson.code != "200") {
        //            alert("下载失败:" + resultJson.msg);
        //            _ajaxLoadEnd();
        //        }
        //        else {
        //            downLoadFiles($scope.args.entityid, resultJson.data.filename, resultJson.data.filebody, resultJson.data.sqlbody);
        //        }
        //        _ajaxLoadEnd();
        //        _ajaxLoadEnd();
        //    }
        //});
    }

    $scope.SelectTemplateChange = function (datavalue) {
        $scope.selectTemplateModel = datavalue;
    }
    function _ajaxLoading(msg) {
        $("<div class=\"datagrid-mask\" style=\"z-index:10001;\"></div>").css({ display: "block", position: "fixed", width: "100%", height: "100%" }).appendTo("body");
        $("<div class=\"datagrid-mask-msg\" style=\"z-index:10002;\"></div>").html(msg).appendTo("body").css({ display: "block", position: "fixed", left: ($(document.body).outerWidth(true) - 190) / 2, bottom: ($(window).height()) / 10 });
    }
    function _ajaxLoadEnd() {
        $(".datagrid-mask").remove();
        $(".datagrid-mask-msg").remove();
    }
    function base64ToArrayBuffer(base64) {
        var binaryString = window.atob(base64);
        var len = binaryString.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    function downLoadFiles(enttyDataId, filename, filebody, sqlbody) {
        //debugger;
        //var orgUniqueName = Xrm.Page.context.getOrgUniqueName();
        //if (orgUniqueName == "360CRMDEV") {
        //    orgUniqueName = "_" + orgUniqueName;
        //}
        //$.ajax({
        //    type: "POST",
        //    dataType: "json",
        //    async: false,
        //    url: "/ISV/OfflinCPQ.WebApplication/OfflineCPQFileDownload.ashx",
        //    data: {
        //        TemplateBody: filebody,
        //        enttyDataId: enttyDataId,
        //        SqlBody: sqlbody,
        //        OrganizationName: orgUniqueName,
        //        r: Math.random()
        //    },
        //    success: function (data) {
        //        if (data.code != "200") {
        //            alert("下载失败:" + data.msg);
        //        }
        //        else {
        //            download(base64ToArrayBuffer(data.data.filebody), filename, "application/pdf");
        //        }
        //    },
        //    error: function (ex) {
        //        var mgs = "'" + ex.responseText + "'";
        //        alert(mgs);
        //    }
        //});
    }
});