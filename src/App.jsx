
import { useEffect, useState } from 'react';
import {getAllPokemon, getPokemon} from "./utils/pokemon";
import Card from "./components/Card";
import Navbar from "./components/Navbar";
 
import './App.css'

function App() {
  const initalURL = "https://pokeapi.co/api/v2/pokemon";
  const [loading, setLoading] = useState(true);
  const [pokemonData, setPokemonData] = useState([]);
  const [nextURL, setNextURL] = useState("");
  const [PrevPageURL, setPrevPageURL] = useState("");



useEffect (() =>{
  const fetchPokemonData = async () =>{
    //全てのポケモンデータを取得
    let res = await getAllPokemon(initalURL);
    //各ポケモンデータを取得
    loadPokemon(res.results)
    // console.log(res)
    setNextURL(res.next)
    setPrevPageURL(res.previous)
    setLoading(false);
  }
  fetchPokemonData();
},[])  


const loadPokemon = async  (data) => {
  let _pokemonData = await Promise.all(
    data.map((pokemon) => {
     
      let pokemonRecord = getPokemon(pokemon.url);
      return pokemonRecord
    })
  )
  setPokemonData(_pokemonData);
}

const handlePrevPage = async () => {
  if(!PrevPageURL) return;
  setLoading(true);
  let data = await getAllPokemon(PrevPageURL);
  
  await loadPokemon(data.results)
  setNextURL(data.next);
  setPrevPageURL(data.previous);
  setLoading(false);
};

const handleNextPage = async () => {
  setLoading(true);
  let data = await getAllPokemon(nextURL);
  //console.log(data)
  await loadPokemon(data.results)
  setNextURL(data.next);
  setPrevPageURL(data.previous);
  setLoading(false);
};


//console.log(pokemonData);
  return (
    <>
      <Navbar />
      <div className='App'>
       {loading ? (
        <h1> Loading・・・・</h1>
       ) :
        <>
          <div className="pokemonCardContainer">
            {pokemonData.map((pokemon, i) => {
              return <Card key = {i} pokemon = {pokemon} />  
            })}
          </div>
          <div className="btn">
            <button onClick={handlePrevPage}>前へ</button>
            <button onClick={handleNextPage}>次へ</button>
          </div>

        </>
       
       
       
       } 
      </div>
    </>
  )
}

export default App
