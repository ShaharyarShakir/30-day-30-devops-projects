import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";

type Props = {
  prediction: "NORMAL" | "PNEUMONIA";
  confidence: number;
};

export function ProbabilityCard({ prediction, confidence }: Props) {
  const isNormal = prediction === "NORMAL";
  const normalProb = isNormal ? confidence : 1 - confidence;
  const pneumoniaProb = isNormal ? 1 - confidence : confidence;

  const data = [
    { name: "Normal", value: Number((normalProb * 100).toFixed(2)) },
    { name: "Pneumonia", value: Number((pneumoniaProb * 100).toFixed(2)) },
  ];

  return (
    <Card className="border-slate-800 bg-[#0f172a]/60 backdrop-blur-md shadow-lg shadow-black/25">
      <CardHeader className="border-b border-slate-800/60 pb-4">
        <CardTitle className="text-lg font-bold text-slate-200">Probability Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} unit="%" />
              <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  borderColor: "#1e293b",
                  borderRadius: "12px",
                  color: "#f8fafc",
                }}
                formatter={(value: any) => [`${value}%`, "Probability"]}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.name === "Normal" ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
