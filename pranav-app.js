(() => {
  function charts() {
    // boxPlotDataFilter();
    bubbleMapFilter();
  }

  // function boxPlotDataFilter() {
  //   d3.csv("Cleaned.csv").then(function(data1) {
  //     // console.log("786 data", data1);
  //     let data = [],
  //       min = 0,
  //       max = 0;
  //     data1.forEach((d, i) => {
  //       if (d.location_name.localeCompare("McDonald's") == 0) {
  //         d.visits_by_day = parseFloat(d.visits_by_day);
  //         data.push(d.visits_by_day);
  //       }
  //     });
  //
  //     data.sort();
  //     min = data[0];
  //     max = data[data.length - 1];
  //
  //     // console.log("786 data", data, min, max);
  //
  //     boxPlot(data);
  //
  //     d3.select("#McDonald").on("change", function(i, d) {
  //       if (this.checked) {
  //         let value = document.getElementById("McDonald").value;
  //         data = [];
  //         data1.forEach((d, i) => {
  //           if (d.location_name.localeCompare("McDonald's") == 0) {
  //             d.visits_by_day = parseFloat(d.visits_by_day);
  //             data.push(d.visits_by_day);
  //           }
  //         });
  //
  //         data.sort();
  //         min = data[0];
  //         max = data[data.length - 1];
  //         boxPlot(data);
  //       }
  //     });
  //
  //     d3.select("#Wendy").on("change", function(i, d) {
  //       if (this.checked) {
  //         let value = document.getElementById("Wendy").value;
  //         data = [];
  //         data1.forEach((d, i) => {
  //           if (d.location_name.localeCompare("Wendy's") == 0) {
  //             d.visits_by_day = parseFloat(d.visits_by_day);
  //             data.push(d.visits_by_day);
  //           }
  //         });
  //
  //         data.sort();
  //         min = data[0];
  //         max = data[data.length - 1];
  //         boxPlot(data);
  //       }
  //     });
  //
  //     d3.select("#BurgerKing").on("change", function(i, d) {
  //       if (this.checked) {
  //
  //         let value = document.getElementById("BurgerKing").value;
  //         data = [];
  //         data1.forEach((d, i) => {
  //           if (d.location_name.localeCompare("Burger King") == 0) {
  //             d.visits_by_day = parseFloat(d.visits_by_day);
  //             data.push(d.visits_by_day);
  //           }
  //         });
  //
  //         data.sort();
  //         min = data[0];
  //         max = data[data.length - 1];
  //         boxPlot(data);
  //       }
  //     });
  //   });
  // }
  //
  // function boxPlot(data) {
  //   d3.select("#boxplot svg").remove();
  //   var margin = {
  //       top: 10,
  //       right: 30,
  //       bottom: 30,
  //       left: 75
  //     },
  //     width = 400 - margin.left - margin.right,
  //     height = 400 - margin.top - margin.bottom;
  //
  //   var svg = d3
  //     .select("#boxplot")
  //     .append("svg")
  //     .attr("width", width + margin.left + margin.right)
  //     .attr("height", height + margin.top + margin.bottom)
  //     .append("g")
  //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  //
  //   var data_sorted = data;
  //
  //   var q1 = d3.quantile(data_sorted, 0.25);
  //   var median = d3.quantile(data_sorted, 0.5);
  //   var q3 = d3.quantile(data_sorted, 0.75);
  //   var interQuantileRange = q3 - q1;
  //   var min = q1 - 1.5 * interQuantileRange;
  //   var max = q1 + 1.5 * interQuantileRange;
  //
  //   var y = d3
  //     .scaleLinear()
  //     .domain([min - 11, max + 11])
  //     .range([height, 0]);
  //   svg.call(d3.axisLeft(y));
  //
  //   svg
  //     .append("text")
  //     .attr("transform", "rotate(-90)")
  //     .attr("y", 0 - margin.left)
  //     .attr("x", 0 - height / 2)
  //     .attr("dy", "1em")
  //     .style("text-anchor", "middle")
  //     .style("stroke", "black")
  //     .style("font-size", "15px")
  //     .text("Visits per Day");
  //
  //   var center = 200;
  //   var width = 100;
  //
  //   svg
  //     .append("line")
  //     .attr("x1", center)
  //     .attr("x2", center)
  //     .attr("y1", y(min))
  //     .attr("y2", y(max))
  //     .attr("stroke", "black");
  //
  //   svg
  //     .append("rect")
  //     .attr("x", center - width / 2)
  //     .attr("y", y(q3))
  //     .attr("height", y(q1) - y(q3))
  //     .attr("width", width)
  //     .attr("stroke", "black")
  //     .style("fill", "#69b3a2");
  //
  //   svg
  //     .selectAll("toto")
  //     .data([min, median, max])
  //     .enter()
  //     .append("line")
  //     .attr("x1", center - width / 2)
  //     .attr("x2", center + width / 2)
  //     .attr("y1", function(d) {
  //       return y(d);
  //     })
  //     .attr("y2", function(d) {
  //       return y(d);
  //     })
  //     .attr("stroke", "black");
  // }

  function bubbleMapFilter() {
    bubbleMap("McDonald's");
    d3.select("#McDonald_sandiego").on("change", function(i, d) {
      bubbleMap("McDonald's");
    });

    d3.select("#Wendy_sandiego").on("change", function(i, d) {
      if (this.checked) {
        bubbleMap("Wendy's");
      }
    });

    d3.select("#BurgerKing_sandiego").on("change", function(i, d) {
      if (this.checked) {
        bubbleMap("Burger King");
      }
    });
  }

  function bubbleMap(restaurant) {
    d3.select("#map svg").remove();
    d3.select("#mapdiv").remove();
    var margin = {
        top: 10,
        right: 30,
        bottom: 30,
        left: 40
      },
      width = 1000 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

    var svg = d3
      .select("#map")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("id", "mapg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var tooltip = d3
      .select("#map")
      .append("div")
      .attr("width", 11)
      .attr("height", 11)
      .attr("class", "tooltips")
      .style("visibility", "hidden");

    d3.json("map.geojson").then(function(us) {
      d3.csv("Cleaned.csv").then(function(data) {
        const projection = d3.geoAlbersUsa().fitSize([width, height], us);

        data = d3.flatGroup(data
          .filter((d) => d.location_name.localeCompare(restaurant) == 0), (d) =>
          d.street_address
        ).map((d) => ({
          "location_name": d[1][0].location_name,
          "street_address": d[0],
          "longitude": d[1][0].longitude,
          "latitude": d[1][0].latitude,
          "city": d[1][0].city,
          "raw_visit_counts": d3.mean(d[1], (r) => r.visits_by_day),
          "raw_visitor_counts": d3.mean(d[1], (r) => r.visits_by_day)

        }));

        //console.log(data);

        let data1 = [];
        let min = 0,
          max = 0;
        data.forEach((d, i) => {
          // if (i == 0) {
          //   console.log("786 d", d);
          // }

          if (d.city.localeCompare("San Diego") == 0) {
            data1.push(d);
            d.raw_visit_counts = d.raw_visit_counts;
            d.raw_visitor_counts = d.raw_visitor_counts;

            if (d.raw_visit_counts < min) {
              min = d.raw_visitor_counts;
            }

            if (d.raw_visit_counts > max) {
              max = d.raw_visitor_counts;
            }
          }
        });

        data = data1;
        var color = d3
          .scaleOrdinal()
          .domain(["Burger King", "Wendy's", "McDonald's"])
          .range(["#000e8a", "#D18975", "#ba0900"]);

        const size = d3.scaleLinear().domain([min, max]).range([3, 16]);

        const sdPath = svg
          .append("g")
          .attr('id', 'plot6-sdPath')

        sdPath.selectAll("path")
          .data(us.features)
          .join("path")
          .attr("d", d3.geoPath().projection(projection))
          .attr("fill", "green")
          .attr("stroke", "black")
          .attr("fill-opacity", 0.21);

        sdPath.selectAll('path')
          .each(function(d, i) {
            if (this.getBBox().x > 600) {
              d3.select(this).remove()
            }
          });
        const sdPathBBox = sdPath.node().getBBox();
        svg.append('text')
          .attr('x', sdPathBBox.x + sdPathBBox.width)
          .attr('y', 10)
          .text("San Diego City Borders")

        svg
          .selectAll("circle")
          .data(data)
          .enter()
          .append("circle")
          .attr('cursor', 'pointer')
          .attr("cx", function(d) {
            return projection([
              parseFloat(d.longitude),
              parseFloat(d.latitude),
            ])[0];
          })
          .attr("cy", function(d) {
            return projection([
              parseFloat(d.longitude),
              parseFloat(d.latitude),
            ])[1];
          })
          .attr("r", function(d) {
            return size(d.raw_visitor_counts);
          })
          .style("fill", function(d) {
            return color(d.location_name);
          })
          .attr("opacity", 0.8)
          // .attr("stroke", function(d) {
          //   return color(d.location_name);
          // })
          // .attr("stroke-width", 3)
          .on("mouseover", function(i, d) {
            d3.select(this).transition()
              .duration(200)
              .attr('opacity', 1)
            tooltip.html(
              `Address: ${d.street_address} <br> Average daily visitors : ${Math.trunc(d.raw_visit_counts)}`
            );
            tooltip.style("visibility", "visible");

            // tooltip
            //   .style("top", event.pageY + "px")
            //   .style("left", event.pageX + "px");
          })
          .on("mouseout", function() {
            d3.select(this).transition()
              .duration(200)
              .attr('opacity', 0.8)
            tooltip.style("visibility", "hidden");
          });
      });
    });
  }

  charts();
})();
