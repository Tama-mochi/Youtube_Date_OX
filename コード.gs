/*
 * Google Apps Script (Advanced Services): YouTube Data API v3 を使って、
 * シートで指定した各日付（東京タイムゾーン）に動画投稿があるかをチェックし、結果を「O/X」で記録、
 * 未投稿の場合は Discord に通知します。
 * ※ Advanced Google Services で YouTube Data API,Sheets を有効化してください。
 */

function checkYouTubePosts() {
  var ss = SpreadsheetApp.openById('1_BPOijXogpbgH1x3sm6jEzbhN1z8zWnKeDbow4WNkX8');
  var sheet = ss.getSheetByName('hantei_kekka');
  if (!sheet) throw new Error('Sheet not found');

  var tz = 'Asia/Tokyo';
  var dates = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat()
    .map(function(d) { return Utilities.formatDate(new Date(d), tz, 'yyyy-MM-dd'); });
  var handles = sheet.getRange(1, 2, 1, sheet.getLastColumn() - 1).getValues()[0];

  handles.forEach(function(handle, i) {
    var name = handle.replace(/^@/, '');
    var channelId = getChannelIdBySearch(name);
    if (!channelId) {
      Logger.log('Channel not found: ' + name);
      return;
    }

    dates.forEach(function(day, j) {
      var cell = sheet.getRange(j + 2, i + 2);
      var found = hasVideoOnDate(channelId, day);
      cell.setValue(found ? 'O' : 'X');
      if (!found) {
        postToDiscord(
          'https://discord.com/api/webhooks/1349389065115402320/Dq8FWQHWyUJPd2O9oZb-kQm8uEz1_tiDOTT62w7B5z_bQ-cvKt56Fc5Lx7DmNFJ6cLBH',
          { content: 'チャンネル @' + name + ' の ' + day + ' の動画が投稿されていません' }
        );
      }
    });
  });

  SpreadsheetApp.flush();
}

/**
 * チャンネル名で検索して channelId を取得
 */
function getChannelIdBySearch(handle) {
  var response = YouTube.Search.list('snippet', {
    q: handle,
    type: 'channel',
    maxResults: 1
  });
  if (response.items && response.items.length > 0 && response.items[0].id.channelId) {
    return response.items[0].id.channelId;
  }
  return null;
}

/**
 * 指定日付（東京タイムゾーン）の動画があるかをチェック
 */
function hasVideoOnDate(channelId, date) {
  var publishedAfter = date + 'T00:00:00+09:00';
  var publishedBefore = date + 'T23:59:59+09:00';
  var response = YouTube.Search.list('snippet', {
    channelId: channelId,
    publishedAfter: publishedAfter,
    publishedBefore: publishedBefore,
    maxResults: 1,
    type: 'video'
  });
  return (response.items && response.items.length > 0);
}

function postToDiscord(hookUrl, payload) {
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  var res = UrlFetchApp.fetch(hookUrl, options);
  if (res.getResponseCode() == 429) {
    var retry = JSON.parse(res.getContentText()).retry_after || 1;
    Utilities.sleep((retry + 1) * 1000);
    UrlFetchApp.fetch(hookUrl, options);
  }
}




/*
function logRecentVideos(){
  var urls=SpreadsheetApp.openById('14_CxPDVMczs4yJYrsehK24qTR7nGlRig5YKcDAiojhU')
    .getSheetByName('hantei_kekka')
    .getRange(1,2,1,SpreadsheetApp.openById('14_CxPDVMczs4yJYrsehK24qTR7nGlRig5YKcDAiojhU').getSheetByName('hantei_kekka').getLastColumn()-1)
    .getValues()[0];
  var tz='Asia/Tokyo';
  urls.forEach(function(url){
    var id=resolveChannelId(url);
    if(!id) return;
    var res=YouTube.Search.list('snippet',{channelId:id,maxResults:10,order:'date'});
    res.items.forEach(function(item){
      var pub=Utilities.formatDate(new Date(item.snippet.publishedAt),tz,'yyyy-MM-dd HH:mm:ss');
      console.log('['+pub+'] '+item.snippet.title);
    });
  });
}
*/