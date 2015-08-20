/*
 * 5374 setting
 *
*/

var SVGLabel = false; // SVGイメージを使用するときは、true。用意できない場合はfalse。

var MaxDescription = 9; // ごみの最大種類、９を超えない場合は変更の必要はありません。

var MaxMonth = 3;

var WeekShift = true; // 休止期間なら週をずらすときは、true。金沢の仕様は、true。

var UseAreaMaster = false;   //  エリアマスターを利用するかどうか  true の場合  地域の2段階選択を行う
                             //   true の場合 area_days.csv の1カラム目がマスターのコードでなければいけない
                             //   false  の場合 area_days.csv の1カラム目はマスターのコードははいらない
                             //                    金沢版のarea_days.csv と同じ仕様になる
