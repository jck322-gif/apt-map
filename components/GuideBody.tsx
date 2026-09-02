import type { Block } from "@/lib/guides";

/** 글 본문 블록을 화면에 그립니다. */
export default function GuideBody({ body }: { body: Block[] }) {
  return (
    <div className="guide-body">
      {body.map((b, i) => {
        switch (b.t) {
          case "h2":
            return <h2 key={i}>{b.text}</h2>;
          case "p":
            return <p key={i}>{b.text}</p>;
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ol>
            );
          case "note":
            return (
              <p key={i} className="guide-note">
                {b.text}
              </p>
            );
          case "table":
            return (
              <div className="top5-table-wrap" key={i}>
                <table className="top5-table guide-table">
                  <thead>
                    <tr>
                      {b.head.map((h, j) => (
                        <th key={j}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td key={k}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
