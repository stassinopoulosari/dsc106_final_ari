(function() {
  var cachedData = null;
  window.loadData = function(preprocessor) {
    if (!preprocessor) {
      preprocessor = (data) => data;
    }
    return new Promise((accept, reject) => {
      if (cachedData) {
        return accept(preprocessor(cachedData));
      }
      const filePath = "data/Cleaned.csv"
      d3.csv(filePath).then((data) => {
        cachedData = data;
        return accept(preprocessor(data));
      })
    });
  }
})();
