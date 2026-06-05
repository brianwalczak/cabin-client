let step = 1;

function setStep(num) {
    const steps = document.getElementsByClassName('step');
    const dots = document.getElementsByClassName('dot');
    if (num > steps.length) return window?.finish();

    // reset all steps and dots
    for (let i = 0; i < steps.length; i++) {
        steps[i].classList.add('hidden');
        steps[i].classList.remove('flex');
        dots[i].classList.remove('bg-white/60');
        dots[i].classList.add('bg-white/20');
    }

    // show new step and dot
    step = num;
    steps[step - 1].classList.remove('hidden');
    steps[step - 1].classList.add('flex');
    dots[step - 1].classList.remove('bg-white/20');
    dots[step - 1].classList.add('bg-white/60');
}

function nextStep() { setStep(step + 1); }
function prevStep() { setStep(step - 1); }

setStep(1);