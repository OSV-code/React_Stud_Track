let chartInstance = null;

async function generateTrendChart(){

    const studentId =
    Number(document.getElementById("chartStudent").value);

    if(!studentId) {
        alert("Please select a student first.");
        return;
    }

    const marks =
    await db.marks
    .where("studentId")
    .equals(studentId)
    .toArray();

    if(!marks.length){

        alert("No marks data available");

        return;
    }

    const labels =
    marks.map(
        m=>`${m.subject} (${m.examType})`
    );

    const values =
    marks.map(
        m=>m.marks
    );

    const canvas =
    document.getElementById("trendChart");

    const ctx =
    canvas.getContext("2d");

    if(chartInstance){

        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx,{

        type:"line",

        data:{

            labels,

            datasets:[{

                label:"Student Marks Trend",

                data:values,

                borderWidth:3,

                tension:0.3
            }]
        },

        options:{

            responsive:true,

            scales:{

                y:{

                    beginAtZero:true
                }
            }
        }
    });
}