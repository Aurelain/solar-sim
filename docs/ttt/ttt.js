const full = [0,0,0,0,0,0,0,0,0];
let current = 'X';


const div1 = document.querySelector('#t1');
div1.onclick = function(){
	doAfterClick(0,div1);
}
const div2 = document.querySelector('#t2');
div2.onclick = function(){
	doAfterClick(1, div2);
}
const div3 = document.querySelector('#t3');
div3.onclick = function(){
	doAfterClick(2, div3);
}
const div4 = document.querySelector('#t4');
div4.onclick = function(){
	doAfterClick(3, div4);
}
const div5 = document.querySelector('#t5');
div5.onclick = function(){
	doAfterClick(4, div5);
}
const div6 = document.querySelector('#t6');
div6.onclick = function(){
	doAfterClick(5, div6);
}
const div7 = document.querySelector('#t7');
div7.onclick = function(){
	doAfterClick(6, div7);
}
const div8 = document.querySelector('#t8');
div8.onclick = function(){
	doAfterClick(7, div8);
}
const div9 = document.querySelector('#t9');
div9.onclick = function(){
	doAfterClick(8, div9);
}


function doAfterClick (n, div){
	
	if (full[n] != 0){
		return;
	}
	
	div.textContent = current;
	div.className = 'disabled';
	
	full[n] = current;
	if (current == 'X'){
		current = 'O';
	}else {
		current = 'X';
	}
	console.log(full);
	checkVictory(0,1,2);
	checkVictory(3,4,5);
	checkVictory(6,7,8);
	checkVictory(0,3,6);
	checkVictory(1,4,7);
	checkVictory(2,5,8);
	checkVictory(0,4,8);
	checkVictory(2,4,6);
	
}
function checkVictory (a,b,c){
	if (full[a] && full[a] == full[b] && full[a] == full[c]){
		setTimeout(alert, 0, full[a] + ' won!');
		document.documentElement.className = 'disabled';
		document.querySelector('#t' + (a+1)).className = 'victory';
		document.querySelector('#t' + (b+1)).className = 'victory';
		document.querySelector('#t' + (c+1)).className = 'victory';
	}

}