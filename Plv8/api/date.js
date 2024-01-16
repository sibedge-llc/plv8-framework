exports.dateToString = function(date)
{
    var mm = date.getMonth() + 1; // getMonth() is zero-based
    var dd = date.getDate();
  
    return [date.getFullYear(),
            (mm>9 ? '' : '0') + mm,
            (dd>9 ? '' : '0') + dd
           ].join('-');
}

exports.addDays = function(oldDate, days)
{
    var date = new Date(oldDate.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

exports.dateToStr = function(date)
{
    return date.toISOString().substring(0, 10);
}