import React, { useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UserContext } from '../UserContext';

const Login=()=>{

    const [username,setusername]=useState('');
    const [password,setpassword]=useState('');
    const [redirect,setredirect]=useState(false);
    const {setUserInfo}=useContext(UserContext);

    const login=async(ev)=>{
        ev.preventDefault();
        const response = await fetch('http://localhost:4000/login', {
        method: 'POST',
        body: JSON.stringify({username,password}),
        headers: {'Content-Type':'application/json'},
        credentials:"include"
    });
    if(response.ok){
        response.json().then(userInfoo=>{
            setUserInfo(userInfoo);
            setredirect(true);
        })
    }else{
        alert('wrong credentials');
    }
    }

    if(redirect){
        return <Navigate to={"/"}/>
    }

    return(
        <form action='/login' className='login' onSubmit={login}>
            <h1>Login</h1>
            <input 
            type='text' 
            placeholder='Enter your name'
            value={username}
            onChange={ev=>setusername(ev.target.value)}
            />
            <input 
            type='password' 
            placeholder='Enter Password'
            value={password}
            onChange={ev=>setpassword(ev.target.value)}
            />
            <button>Login</button>
        </form>
    )
}

export default Login;



