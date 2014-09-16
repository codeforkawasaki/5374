"use strict";
var ctx = null; //l20n

/**
  エリア(ごみ処理の地域）を管理するクラスです。
*/
var AreaModel = function() {
  this.mastercode;
  this.label;
  this.centerName;
  this.center;
  this.trash = [];
  /**
    各ゴミのカテゴリに対して、最も直近の日付を計算します。
  */
  this.calcMostRect = function() {
    for (var i = 0; i < this.trash.length; i++) {
      this.trash[i].calcMostRect(this);
    }
  };
  /**
    休止期間（主に年末年始）かどうかを判定します。
  */
  this.isBlankDay = function(currentDate) {
    var period = [this.center.startDate, this.center.endDate];

    if (period[0].getTime() <= currentDate.getTime() &&
      currentDate.getTime() <= period[1].getTime()) {
      return true;
    }
    return false;
  };
  /**
    ゴミ処理センターを登録します。
    名前が一致するかどうかで判定を行っております。
  */
  this.setCenter = function(center_data) {
    for (var i in center_data) {
      if (this.centerName == center_data[i].name) {
        this.center = center_data[i];
      }
    }
  };
  /**
    ゴミのカテゴリのソートを行います。
  */
  this.sortTrash = function() {
    this.trash.sort(function(a, b) {
      var at = a.mostRecent.getTime();
      var bt = b.mostRecent.getTime();
      if (at < bt) return -1;
      if (at > bt) return 1;
      return 0;
    });
  };
};

/**
  各ゴミのカテゴリを管理するクラスです。
*/
var TrashModel = function(_lable, _cell, remarks, l10n) {
  this.remarks = remarks;
  this.dayLabel;
  this.mostRecent;
  this.dayList;
  this.mflag = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  var mm = null;
  if (_cell.search(/:/) >= 0) {
    var flag = _cell.split(":");
    this.dayCell = flag[0].split(" ");
    mm = flag[1].split(" ");
  } else {
    this.dayCell = _cell.split(" ");
    mm = ["4", "5", "6", "7", "8", "9", "10", "11", "12", "1", "2", "3"];
  }
  for (var m in mm) {
    this.mflag[mm[m] - 1] = 1;
  }
  this.label = _lable;
  this.description;
  this.regularFlg = 1;      // 定期回収フラグ（デフォルトはオン:1）

  var result_text = "";
  //var today = new Date();

  var day_enum = [
    l10n.entities.sun.value,
    l10n.entities.mon.value,
    l10n.entities.tue.value,
    l10n.entities.wed.value,
    l10n.entities.thu.value,
    l10n.entities.fri.value,
    l10n.entities.sat.value
  ];
  var week_name = {}
  week_name[l10n.entities.sun.value] = l10n.entities.sunday.value;
  week_name[l10n.entities.mon.value] = l10n.entities.monday.value;
  week_name[l10n.entities.tue.value] = l10n.entities.tuesday.value;
  week_name[l10n.entities.wed.value] = l10n.entities.wednesday.value;
  week_name[l10n.entities.thu.value] = l10n.entities.thursday.value;
  week_name[l10n.entities.fri.value] = l10n.entities.friday.value;
  week_name[l10n.entities.sat.value] = l10n.entities.saturday.value;;

  var week_enum = {
    1: l10n.entities.first.value,
    2: l10n.entities.second.value,
    3: l10n.entities.third.value,
    4: l10n.entities.fourth.value,
    5: l10n.entities.fifth.value
  };

  var parts = [];
  for (var j in this.dayCell) {
    parts = this.dayCell[j].match(/([^0-9]+)([0-9])/);
    if ($.inArray(this.dayCell[j], day_enum) > 0) {
      result_text += l10n.entities.every.value + week_name[this.dayCell[j]] + ", ";
    } else if (parts.length === 3 && parts[1] != "*") {
      result_text += week_enum[parts[2]] + week_name[parts[1]] + ", ";
    } else if (parts.length === 3 && parts[1] == "*") {
    } else {
      // 不定期回収の場合（YYYYMMDD指定）
      result_text = "不定期 ";
      this.regularFlg = 0;  // 定期回収フラグオフ
    }
  }
  this.dayLabel = result_text;

  this.getDateLabel = function() {
    var result_text = this.mostRecent.getFullYear() + "/" + (1 + this.mostRecent.getMonth()) + "/" + this.mostRecent.getDate();
    return this.getRemark() + this.dayLabel + " " + result_text;
  };


  function getDayIndex(str) {
    for (var i = 0; i < day_enum.length; i++) {
      if (day_enum[i] == str) {
        return i;
      }
    }
    return -1;
  }
  /**
   * このごみ収集日が特殊な条件を持っている場合備考を返します。収集日データに"*n" が入っている場合に利用されます
   */
  this.getRemark = function getRemark() {
    var ret = "";
    this.dayCell.forEach(function(day){
      if (day.substr(0,1) == "*") {
        remarks.forEach(function(remark){
          if (remark.id == day.substr(1,1)){
            ret += remark.text + "<br/>";
          }
        });
      }
    });
    return ret;
  };
  /**
  このゴミの年間のゴミの日を計算します。
  センターが休止期間がある場合は、その期間１週間ずらすという実装を行っております。
  */
  this.calcMostRect = function(areaObj) {
    var day_mix = this.dayCell;
    //var result_text = "";
    var day_list = [];

    // 定期回収の場合
    if (this.regularFlg === 1) {

      var today = new Date();

      // 12月 +3月　を表現
      for (var i = 0; i < MaxMonth; i++) {

        var curMonth = today.getMonth() + i;
        var curYear = today.getFullYear() + Math.floor(curMonth / 12);
        var month = (curMonth % 12) + 1;

        // 収集が無い月はスキップ
        if (this.mflag[month - 1] === 0) {
            continue;
        }
        for (var j in day_mix) {
          //休止期間だったら、今後一週間ずらす。
          var isShift = false;

          //week=0が第1週目です。
          for (var week = 0; week < 5; week++) {
            //4月1日を起点として第n曜日などを計算する。
            var date = new Date(curYear, month - 1, 1);
            var d = new Date(date);
            //コンストラクタでやろうとするとうまく行かなかった。。
            //
            //4月1日を基準にして曜日の差分で時間を戻し、最大５週までの増加させて毎週を表現
            d.setTime(date.getTime() + 1000 * 60 * 60 * 24 *
              ((7 + getDayIndex(day_mix[j].replace(/[0-9]/, '')) - date.getDay()) % 7) + week * 7 * 24 * 60 * 60 * 1000
            );
            //年末年始のずらしの対応
            //休止期間なら、今後の日程を１週間ずらす
            if (areaObj.isBlankDay(d)) {
              if (WeekShift) {
                isShift = true;
              } else {
                continue;
              }
            }
            if (isShift) {
              d.setTime(d.getTime() + 7 * 24 * 60 * 60 * 1000);
            }
            //同じ月の時のみ処理したい
            if (d.getMonth() != (month - 1) % 12) {
              continue;
            }
            //特定の週のみ処理する
            var last_str = day_mix[j].substr(day_mix[j].length - 1, 1);
            if (!isNaN(last_str - 0)) {
              if (last_str != week) {
                continue;
              }
            }

            day_list.push(d);
          }
        }
      }
    } else {
      // 不定期回収の場合は、そのまま指定された日付をセットする
      for (var j in day_mix) {
        var year = parseInt(day_mix[j].substr(0, 4), 10);
        var month = parseInt(day_mix[j].substr(4, 2), 10) - 1;
        var day = parseInt(day_mix[j].substr(6, 2), 10);
        var d = new Date(year, month, day);
        day_list.push(d);
      }
    }
    //曜日によっては日付順ではないので最終的にソートする。
    //ソートしなくてもなんとなりそうな気もしますが、とりあえずソート
    day_list.sort(function(a, b) {
      var at = a.getTime();
      var bt = b.getTime();
      if (at < bt) return -1;
      if (at > bt) return 1;
      return 0;
    });
    //直近の日付を更新
    var now = new Date();

    for (var i in day_list) {
      if (!this.mostRecent && now.getTime() < day_list[i].getTime() + 24 * 60 * 60 * 1000) {
        this.mostRecent = day_list[i];
        break;
      }
    }

    this.dayList = day_list;
  };
  /**
   計算したゴミの日一覧をリスト形式として取得します。
  */
  this.getDayList = function() {
    var day_text = "<ul>";
    for (var i in this.dayList) {
      var d = this.dayList[i];
      day_text += "<li>" + d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + "</li>";
    }
    day_text += "</ul>";
    return day_text;
  };
};
/**
  センターのデータを管理します。
*/
var CenterModel = function(row) {
  function getDay(center, index) {
    var tmp = center[index].split("/");
    return new Date(tmp[0], tmp[1] - 1, tmp[2]);
  }

  this.name = row[0];
  this.startDate = getDay(row, 1);
  this.endDate = getDay(row, 2);
};
/**
* ゴミのカテゴリを管理するクラスです。
* description.csvのモデルです。
*/
var DescriptionModel = function(data) {
  this.targets = [];

  this.label = data[0];
  this.sublabel = data[1];//not used
  this.description = data[2];//not used
  this.styles = data[3];
  this.background = data[4];

};
/**
 * ゴミのカテゴリの中のゴミの具体的なリストを管理するクラスです。
 * target.csvのモデルです。
 */
var TargetRowModel = function(data) {
  this.type = data[0];
  this.name = data[1];
  this.notice = data[2];
  this.furigana = data[3];
};

/**
 * ゴミ収集日に関する備考を管理するクラスです。
 * remarks.csvのモデルです。
 */
var RemarkModel = function() {
  this.id;
  this.text;
};

/**
  エリアマスターを管理するクラスです。
  area_master.csvのモデルです。
*/
var AreaMasterModel = function() {
  this.mastercode;
  this.name;
};


/* var windowHeight; */

$(function() {
/*   windowHeight = $(window).height(); */

  var center_data = [];
  var descriptions = [];
  var areaModels = [];
  var remarks = [];
  var areaMasterModels  = [];

  function setupL20n() {
    // ブラウザの言語設定
    var lang = navigator.language.toLowerCase();
    $.getJSON('./browser.json', function(settings){
      ctx = L20n.getContext();
      // デフォルト設定と可能言語
      ctx.registerLocales(settings.default_locale, settings.locales);
      ctx.linkResource(function(locale) {
        return './locales/' + locale + '/website.l20n';
      });
      ctx.ready(function() {
        // 実際のinit処理
        masterAreaList();
        //updateAreaList();
      });
      ctx.requestLocales(lang);
    });
  }

  // ローカルストレージ（エリア名）
  function getSelectedAreaName() {
    return localStorage.getItem("selected_area_name");
  }

  function setSelectedAreaName(name) {
    try {
      localStorage.setItem("selected_area_name", name);
    } catch (domException) {
    }
  }

  // ローカルストレージ（エリアマスター名）
  function getSelectedAreaMasterName() {
    return localStorage.getItem("selected_area_master_name");
  }

  function setSelectedAreaMasterName(name) {
    try {
      localStorage.setItem("selected_area_master_name", name);
    } catch (domException) {
    }
  }

  // ローカルストレージ（エリアマスター名）
  function getSelectedAreaMasterNameBefore() {
    return localStorage.getItem("selected_area_master_name_before");
  }

  function setSelectedAreaMasterNameBefore(name) {
    try {
      localStorage.setItem("selected_area_master_name_before", name);
    } catch (domException) {
    }
  }

  function csvToArray(filename, cb) {
    $.get(filename, function(csvdata) {
      //CSVのパース作業
      //CRの解析ミスがあった箇所を修正しました。
      //以前のコードだとCRが残ったままになります。
      // var csvdata = csvdata.replace("\r/gm", ""),
       csvdata = csvdata.replace(/\r/gm, "");
      var line = csvdata.split("\n"),
          ret = [];
      var opt = {
        quotes: false,
        delimiter: ",",
        newline: "\r\n"
      };
      for (var i in line) {
        //空行はスルーする。
        if (line[i].length === 0) continue;

        var csv = new CSV(line[i], opt).parse();
        //var row = line[i].split(",");
        ret.push(csv[0]);
      }
      cb(ret);
    });
  }


  function masterAreaList() {
    ctx.localize(['selectward', 'selectarea'], function(l10n) {
      var langs = l10n.reason.locales;
      var lang = l10n.entities.selectarea.locale;

      // ★エリアのマスターリストを読み込みます
      // 大阪府仕様。大阪府下の区一覧です
      csvToArray("data/" + lang + "/area_master.csv", function(tmp) {
        tmp.shift();    // ラベル
        for (var i in tmp) {
          var row           = tmp[i];
          var area_master   = new AreaMasterModel();
          area_master.mastercode = row[0];
          area_master.name       = row[1];
          areaMasterModels.push(area_master);
        }

        // ListメニューのHTMLを作成
        var selected_master_name = getSelectedAreaMasterName();
        var area_master_select_form = $("#select_area_master");
        var select_master_html = "";

        select_master_html += '<option value="-1">' + l10n.entities.selectward.value + '</option>';
        for (var row_index in areaMasterModels) {
          var area_master_name = areaMasterModels[row_index].name;
          var selected = (selected_master_name == area_master_name) ? 'selected="selected"' : "";

          select_master_html += '<option value="' + row_index + '" ' + selected + " >" + area_master_name + "</option>";
        }

        //デバッグ用
        if (typeof dump == "function") {
          dump(areaMasterModels);
        }
        //HTMLへの適応
        area_master_select_form.html(select_master_html);
        area_master_select_form.change();
      });
    });
  }


  function updateAreaList(mastercode) {
    ctx.localize(['selectarea'], function(l10n) {
      var langs = l10n.reason.locales;
      var lang = l10n.entities.selectarea.locale;
      // 大阪府仕様。区のコード(mastercode)が引数です
      csvToArray("data/" + lang + "/area_days.csv", function(tmp) {
        var area_days_label = tmp.shift();
        for (var i in tmp) {
          var row = tmp[i];
          var area = new AreaModel();
          area.mastercode = row[0];
          area.label = row[1];
          area.centerName = row[2];

          // 区コードが一致した場合のみデータ格納
          if(area.mastercode == mastercode){
            areaModels.push(area);
            var params = [
              'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat',
              'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
              'every', 'first', 'second', 'third', 'fourth', 'fifth'
            ];
            ctx.localize(params, function(l10n) {
              //２列目以降の処理
              for (var r = 3; r < 3 + MaxDescription; r++) {
                if (area_days_label[r]) {
                  var trash = new TrashModel(area_days_label[r], row[r], remarks, l10n);
                  area.trash.push(trash);
                }
              }
            });
          }
        }

        csvToArray("data/" + lang + "/center.csv", function(tmp) {
          //ゴミ処理センターのデータを解析します。
          //表示上は現れませんが、
          //金沢などの各処理センターの休止期間分は一週間ずらすという法則性のため
          //例えば第一金曜日のときは、一周ずらしその月だけ第二金曜日にする
          tmp.shift();
          for (var i in tmp) {
            var row = tmp[i];

            var center = new CenterModel(row);
            center_data.push(center);
          }
          //ゴミ処理センターを対応する各地域に割り当てます。
          for (var i in areaModels) {
            var area = areaModels[i];
            area.setCenter(center_data);
          }
          //エリアとゴミ処理センターを対応後に、表示のリストを生成する。
          //ListメニューのHTML作成
          var selected_name = getSelectedAreaName();
          var area_select_form = $("#select_area");
          var select_html = "";
          select_html += '<option value="-1">' + l10n.entities.selectarea.value + '</option>';
          for (var row_index in areaModels) {
            var area_name = areaModels[row_index].label;
            var selected = (selected_name == area_name) ? 'selected="selected"' : "";

            select_html += '<option value="' + row_index + '" ' + selected + " >" + area_name + "</option>";
          }

          //デバッグ用
          if (typeof dump == "function") {
            dump(areaModels);
          }
          //HTMLへの適応
          area_select_form.html(select_html);
          area_select_form.change();
        });
      });
    });
  }


  function createMenuList(after_action) {
    ctx.localize(['about'], function(l10n) {
      var langs = l10n.reason.locales;
      var lang = l10n.entities.about.locale;

      // 備考データを読み込む
      csvToArray("data/" + lang + "/remarks.csv", function(data) {
        data.shift();
        for (var i in data) {
          remarks.push(new RemarkModel(data[i]));
        }
      });
      csvToArray("data/" + lang + "/description.csv", function(data) {
        data.shift();
        for (var i in data) {
          descriptions.push(new DescriptionModel(data[i]));
        }

        csvToArray("data/" + lang + "/target.csv", function(data) {

          data.shift();
          for (var i in data) {
            var row = new TargetRowModel(data[i]);
            for (var j = 0; j < descriptions.length; j++) {
              //一致してるものに追加する。
              if (descriptions[j].label == row.type) {
                descriptions[j].targets.push(row);
                break;
              }
            }
          }
          after_action();
          $("#accordion2").show();

        });

      });
    });

  }

  function updateData(row_index) {
    ctx.localize(['today', 'tomorrow', 'dayaftertomorrow', 'dayslater'], function(l10n) {
      //SVG が使えるかどうかの判定を行う。
      //TODO Android 2.3以下では見れない（代替の表示も含め）不具合が改善されてない。。
      //参考 http://satussy.blogspot.jp/2011/12/javascript-svg.html
      var ableSVG = (window.SVGAngle !== void 0);
      //var ableSVG = false;  // SVG未使用の場合、descriptionの1項目目を使用
      var areaModel = areaModels[row_index];
      var today = new Date();
      //直近の一番近い日付を計算します。
      areaModel.calcMostRect();
      //トラッシュの近い順にソートします。
      areaModel.sortTrash();
      var accordion_height = window.innerHeight / descriptions.length;
      if(descriptions.length>4){
        accordion_height = window.innerHeight / 4.1;
        if (accordion_height>140) {accordion_height = window.innerHeight / descriptions.length;}
        if (accordion_height<130) {accordion_height=130;}
      }
      var styleHTML = "";
      var accordionHTML = "";
      //アコーディオンの分類から対応の計算を行います。
      for (var i in areaModel.trash) {
        var trash = areaModel.trash[i];

        for (var d_no in descriptions) {
          var description = descriptions[d_no];
          if (description.label != trash.label) {
            continue;
          }
          var target_tag = "";
          var furigana = "";
          var targets = description.targets;
          var targets2 = {};
          // キーごとにグルーピング
          for (var k = 0, len = targets.length; k < len; k++) {
            if (!targets2[targets[k].furigana]) {
              targets2[targets[k].furigana] = [];
            }
            targets2[targets[k].furigana].push(targets[k]);
          }
          // キーをソート
          var initial = Object.keys(targets2).sort();
          for (var l = 0, len = initial.length; l < len; l++) {
            target_tag += '<h4 class="initials">' + initial[l] + "</h4>";
            target_tag += "<ul>";
            for (var k = 0, len2 = targets2[initial[l]].length; k < len2; k++) {
              var item = targets2[initial[l]][k];
              target_tag += '<li>' + item.name;
              if (item.notice.length) {
                target_tag += '<p class="note">' + item.notice + "</p>";
              }
              target_tag += "</li>";
            }
            target_tag += "</ul>";
          }

          var dateLabel = trash.getDateLabel();
          //あと何日かを計算する処理です。
          var leftDay = Math.ceil((trash.mostRecent.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          var leftDayText = "";
          if (leftDay === 0) {
            leftDayText = l10n.entities.today.value;
          } else if (leftDay === 1) {
            leftDayText = l10n.entities.tomorrow.value;
          } else if (leftDay === 2) {
            leftDayText = l10n.entities.dayaftertomorrow.value;
          } else {
            leftDayText = leftDay + ' ' + l10n.entities.dayslater.value;
          }

          styleHTML += '#accordion-group' + d_no + '{background-color:  ' + description.background + ';} ';

          accordionHTML +=
            '<div class="accordion-group" id="accordion-group' + d_no + '">' +
            '<div class="accordion-heading">' +
            '<a class="accordion-toggle" style="height:' + accordion_height + 'px" data-toggle="collapse" data-parent="#accordion" href="#collapse' + i + '">' +
            '<div class="left-day">' + leftDayText + '</div>' +
            '<div class="accordion-table" >';
          if (ableSVG && SVGLabel) {
            accordionHTML += '<img src="' + description.styles + '" alt="' + description.label + '"  />';
          } else {
            accordionHTML += '<p class="text-center">' + description.label + "</p>";
          }
          accordionHTML += "</div>" +
            '<h6><p class="text-left date">' + dateLabel + "</p></h6>" +
            "</a>" +
            "</div>" +
            '<div id="collapse' + i + '" class="accordion-body collapse">' +
            '<div class="accordion-inner">' +
            description.description + "<br />" + target_tag +
            '<div class="targetDays"></div></div>' +
            "</div>" +
            "</div>";
        }
      }
      $("#accordion-style").text('<!-- ' + styleHTML + ' -->');

      var accordion_elm = $("#accordion");
      accordion_elm.html(accordionHTML);

      $('html,body').animate({scrollTop: 0}, 'fast');

      //アコーディオンのラベル部分をクリックしたら
      $(".accordion-body").on("shown.bs.collapse", function() {
        var body = $('body');
        var accordion_offset = $($(this).parent().get(0)).offset().top;
        body.animate({
          scrollTop: accordion_offset
        }, 50);
      });
      //アコーディオンの非表示部分をクリックしたら
      $(".accordion-body").on("hidden.bs.collapse", function() {
        if ($(".in").length === 0) {
          $("html, body").scrollTop(0);
        }
      });

      // リスト部分のクリックでアコーディオンを閉じる
      $('.accordion-body.collapse').on('click', '.accordion-inner', function(){
        $(this).parents('.accordion-group').first().find('.accordion-toggle').trigger('click');
      });
    });
  }

  function onChangeSelect(row_index) {
    if (row_index == -1) {
      $("#accordion").html("");
      setSelectedAreaName("");
      return;
    }
    setSelectedAreaName(areaModels[row_index].label);

    if ($("#accordion").children().length === 0 && descriptions.length === 0) {
      createMenuList(function() {
        updateData(row_index);
      });
    } else {
      updateData(row_index);
    }
  }

  // ★マスターの変更時
  function onChangeSelectMaster(row_index) {
    ctx.localize(['selectarea'], function(l10n) {
      if (row_index == -1) {
        // 初期化
        $("#accordion").html("");
        $("#select_area").html('<option value="-1">' + l10n.entities.selectarea.value + '</option>');
        setSelectedAreaMasterName("");
        return;
      }

      var checkAreaMasterName = getSelectedAreaMasterName();
      var checkAreaMasterNameBefore = getSelectedAreaMasterNameBefore();

      if(checkAreaMasterName == checkAreaMasterNameBefore){
      }else{
        $("#accordion").html("");
        $("#select_area").html('<option value="-1">' + l10n.entities.selectarea.value + '</option>');
        setSelectedAreaName("");
      }

      areaModels.length = 0;

      setSelectedAreaMasterName(areaMasterModels[row_index].name);
      setSelectedAreaMasterNameBefore(areaMasterModels[row_index].name);

      updateAreaList(areaMasterModels[row_index].mastercode);
    });
  }


  function getAreaIndex(area_name) {
    for (var i in areaModels) {
      if (areaModels[i].label == area_name) {
        return i;
      }
    }
    return -1;
  }

  // リストマスターが選択されたら
  $("#select_area_master").change(function(data) {
    var row_index = $(data.target).val();
    //onChangeSelect(row_index);
    // ★ここでselect area変更用の読み込み処理
    onChangeSelectMaster(row_index);
  });

  //リストが選択されたら
  $("#select_area").change(function(data) {
    var row_index = $(data.target).val();
    onChangeSelect(row_index);
  });

  //-----------------------------------
  //位置情報をもとに地域を自動的に設定する処理です。
  //これから下は現在、利用されておりません。
  //将来的に使うかもしれないので残してあります。
  $("#gps_area").click(function() {
    navigator.geolocation.getCurrentPosition(function(position) {
      $.getJSON("area_candidate.php", {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }, function(data) {
        if (data.result === true) {
          var area_name = data.candidate;
          var index = getAreaIndex(area_name);
          $("#select_area").val(index).change();
          alert(area_name + "が設定されました");
        } else {
          alert(data.reason);
        }
      });

    }, function(error) {
      alert(getGpsErrorMessage(error));
    });
  });

  if (getSelectedAreaName() === null) {
    $("#accordion2").show();
    $("#collapseZero").addClass("in");
  }
  if (!navigator.geolocation) {
    $("#gps_area").css("display", "none");
  }

  function getGpsErrorMessage(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "User denied the request for Geolocation.";
      case error.POSITION_UNAVAILABLE:
        return "Location information is unavailable.";
      case error.TIMEOUT:
        return "The request to get user location timed out.";
      case error.UNKNOWN_ERROR:
      default:
        return "An unknown error occurred.";
    }
  }

  setupL20n();

});
