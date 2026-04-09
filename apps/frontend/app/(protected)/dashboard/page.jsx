export default function DashboardPage() {
  const embedOptions = [
    "navContentPaneEnabled=false",
    "filterPaneEnabled=false",
  ].join("&");

  const dashboards = [
    "https://app.powerbi.com/view?r=eyJrIjoiNTAzYzYyMWItYWVhYS00NGU2LTlkZTAtNWEwYmM4YWQ3ZTFjIiwidCI6ImM0YTY2YzM0LTJiYjctNDUxZi04YmUxLWIyYzI2YTQzMDE1OCIsImMiOjR9&pageName=1dcfa977e20667420a1d",
    "https://app.powerbi.com/view?r=eyJrIjoiNTAzYzYyMWItYWVhYS00NGU2LTlkZTAtNWEwYmM4YWQ3ZTFjIiwidCI6ImM0YTY2YzM0LTJiYjctNDUxZi04YmUxLWIyYzI2YTQzMDE1OCIsImMiOjR9&pageName=cb1fc32f622a7fef7b7e",
    "https://app.powerbi.com/view?r=eyJrIjoiNTAzYzYyMWItYWVhYS00NGU2LTlkZTAtNWEwYmM4YWQ3ZTFjIiwidCI6ImM0YTY2YzM0LTJiYjctNDUxZi04YmUxLWIyYzI2YTQzMDE1OCIsImMiOjR9&pageName=9dae452bb92dc0fa9378",
    "https://app.powerbi.com/view?r=eyJrIjoiNTAzYzYyMWItYWVhYS00NGU2LTlkZTAtNWEwYmM4YWQ3ZTFjIiwidCI6ImM0YTY2YzM0LTJiYjctNDUxZi04YmUxLWIyYzI2YTQzMDE1OCIsImMiOjR9&pageName=19c1667e8492e8c19e40",
  ];

  return (
    <div className="mx-auto w-full max-w-450 space-y-6 px-4 py-6 md:px-6">
      <h1 className="text-3xl font-bold md:text-4xl">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {dashboards.map((src, index) => (
          <section key={src} className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <header className="border-b px-4 py-3 text-sm font-medium text-slate-700">
              Dashboard {index + 1}
            </header>
            <div className="relative h-130 w-full overflow-hidden md:h-155">
              <iframe
                title={`Ripnel Dashboard ${index + 1}`}
                src={`${src}&${embedOptions}`}
                className="h-full w-full"
                frameBorder="0"
                allowFullScreen
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 z-20 h-10 cursor-default border-t border-slate-200 bg-white"
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}