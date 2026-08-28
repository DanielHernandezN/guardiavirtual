import Chat from "../components/chat";


export default function Dashboard() {


  return (
    <main className="
    flex 
    flex-row
    max-w-full
    min-h-screen">

      <section className="
      w-[20%]
      flex
      flex-col
      p-6
      gap-8
      bg-[#d2d2df]
      ">
        <div className="
        flex
        flex-col
        gap-4
        ">
            <h2>CABO VIRTUAL</h2>
            <h3>FUNCIONARIO</h3>
            <p>Daniel Hernández Norambuena</p>
        </div>

        <div className="
        flex
        flex-col
        gap-2
        ">
            <h2>AGENTES</h2>
                <p>Agente 1</p>
                <p>Agente 2</p>
                <p>Agente 3</p> 
        </div>
      </section>
      
      <Chat />

    </main>
  );
}


