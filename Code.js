// Code.gs
// 定義授權使用者名單
var AUTHORIZED_USERS = ['ian.chen@aotter.net', 'cjay@aotter.net', 'coki.lu@aotter.net', 'john.chiu@aotter.net', 'phsu@aotter.net', 'robert.hsueh@aotter.net', 'smallmouth@aotter.net'];

// 處理 HTTP GET 請求
function doGet(e) {
  Logger.log('Authorized Users: ' + JSON.stringify(AUTHORIZED_USERS));
  
  var user = 'Unknown';
  var errorMessage = '';
  
  // 嘗試獲取使用者的 email
  try {
    user = Session.getActiveUser().getEmail();
    Logger.log('User email retrieved: ' + user);
  } catch (error) {
    errorMessage = 'Error getting user email: ' + error.toString();
    Logger.log(errorMessage);
  }
  
  // 驗證使用者是否在授權名單中
  var isAuthorized = AUTHORIZED_USERS.includes(user);
  Logger.log('Is user authorized: ' + isAuthorized);
  
  // 若使用者授權成功，回傳主頁面，否則顯示錯誤訊息
  if (isAuthorized) {
    Logger.log('Access granted. Returning main page.');
    return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('DSP 監控系統，查看營收是否有 under')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    Logger.log('Access denied. Returning error page.');
    var output = HtmlService.createHtmlOutput(`
      <h1>對不起，您沒有權限訪問此頁面。</h1>
      <script>
        function checkManualAuth() {
          var email = document.getElementById('email').value;
          google.script.run.withSuccessHandler(function(result) {
            if (result) {
              window.location.reload();
            } else {
              alert('驗證失敗，您沒有權限訪問此頁面。');
            }
          }).checkManualAuth(email);
        }
      </script>
    `)
    .setTitle('訪問被拒絕')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return output;
  }
}

// 手動驗證授權
function checkManualAuth(email) {
  Logger.log('Checking manual auth for email: ' + email);
  var isAuthorized = AUTHORIZED_USERS.includes(email);
  Logger.log('Manual auth result: ' + isAuthorized);
  return isAuthorized;
}

// 從 API 獲取數據
function fetchData() {
  var today = new Date();
  var thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000); // 計算30天前的日期
  
  var endDate = today.getTime();
  var startDate = thirtyDaysAgo.getTime();

  // 調用後端 API 獲取營收數據，使用開始日期和結束日期作為參數
  var url = `https://trek.aotter.net/api/publisher_revenue_admin/allrevenue?startDate=${startDate}&endDate=${endDate}`;
  
  // 設定 API 請求時所使用的 Cookie
  var manualCookie = "AOTTERBD_SESSION=757418f543a95a889184e798ec5ab66d4fad04e5-lats=1724229220332&sso=PIg4zu/Vdnn/A15vMEimFlVAGliNhoWlVd5FTvtEMRAFpk/VvBGvAetanw8DLATSLexy9pee/t52uNojvoFS2Q==;aotter=eyJ1c2VyIjp7ImlkIjoiNjNkYjRkNDBjOTFiNTUyMmViMjk4YjBkIiwiZW1haWwiOiJpYW4uY2hlbkBhb3R0ZXIubmV0IiwiY3JlYXRlZEF0IjoxNjc1MzE2NTQ0LCJlbWFpbFZlcmlmaWVkIjp0cnVlLCJsZWdhY3lJZCI6bnVsbCwibGVnYWN5U2VxSWQiOjE2NzUzMTY1NDQ3ODI5NzQwMDB9LCJhY2Nlc3NUb2tlbiI6IjJkYjQyZTNkOTM5MDUzMjdmODgyZmYwMDRiZmI4YmEzZjBhNTlmMDQwYzhiN2Y4NGY5MmZmZTIzYTU0ZTQ2MDQiLCJ1ZWEiOm51bGx9; *Secure-1PSID=vlPPgXupFroiSjP1/A02minugZVZDgIG4K; *Secure-1PSIDCC=g.a000mwhavReSVd1vN09AVTswXkPAhyuW7Tgj8-JFhj-FZya9I_l1B6W2gqTIWAtQUTQMkTxoAwACgYKAW0SARISFQHGX2MiC--NJ2PzCzDpJ0m3odxHhxoVAUF8yKr8r49abq8oe4UxCA0t_QCW0076; *Secure-3PSID=AKEyXzUuXI1zywmFmkEBEBHfg6GRkRM9cJ9BiJZxmaR46x5im*krhaPtmL4Jhw8gQsz5uFFkfbc; _Secure-3PSIDCC=sidts-CjEBUFGohzUF6oK3ZMACCk2peoDBDp6djBwJhGc4Lxgu2zOlzbVFeVpXF4q1TYZ5ba6cEAA";

  var options = {
    'method': 'get',
    'headers': {
      'Cookie': manualCookie
    },
    'muteHttpExceptions': true
  };

  // 發送請求並獲取回應
  var response = UrlFetchApp.fetch(url, options);
  var json = response.getContentText();
  var data = JSON.parse(json); // 將回應轉換為 JSON 格式

  return processData(data); // 處理數據並回傳
}

// 處理 API 返回的數據，篩選出最近30天的營收數據
function processData(data) {
  var processedData = [];
  var today = new Date();
  var thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  data.success.list_backfill.forEach(function(item) {
    var date = new Date(item.date);
    if (date >= thirtyDaysAgo && date <= today) {
      var revenue = item.revenue;

      if (item.dspName === 'UCFUNNEL') {
        revenue = revenue * item.exchangeRate * 0.075;
      }

      revenue += item.revenueOfData || 0;


      processedData.push({
        date: item.date,
        dspName: item.dspName,
        platform: item.platform,
        appName: item.appName,
        place: item.place,
        placeId: item.placeId,
        revenue: revenue,
        r: item.r,
        rr: item.rr,
        revenueOfData: item.revenueOfData // 添加這一行
      });
    }
  });

  return processedData;
}





// 根據數據生成篩選器選項
function getFilters(data) {
  var filters = {
    dspName: [],
    platform: [],
    appName: [],
    place: []
  };

  // 從數據中提取所有唯一的篩選條件
  data.forEach(function(item) {
    if (!filters.dspName.includes(item.dspName)) filters.dspName.push(item.dspName);
    if (!filters.platform.includes(item.platform)) filters.platform.push(item.platform);
    if (!filters.appName.includes(item.appName)) filters.appName.push(item.appName);
    if (!filters.place.includes(item.place)) filters.place.push(item.place);
  });

  return filters; // 回傳篩選器
}

// 根據應用程式名稱和平台過濾出對應的版位選項
function getFilteredPlaces(data, appName, platform) {
  return data
    .filter(item => item.appName === appName && item.platform === platform) // 篩選符合條件的數據
    .map(item => item.place) // 獲取版位名稱
    .filter((value, index, self) => self.indexOf(value) === index); // 去重
}
